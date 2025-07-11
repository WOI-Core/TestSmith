// server/controllers/ProblemController.js
const ProblemRepository = require('../repositories/ProblemRepository');
const supabase = require('../config/database');
const axios = require('axios');
const SupabaseService = require('../services/SupabaseService');

class ProblemController {
    static async getAllProblems(req, res, next) {
        try {
            const problemRepo = new ProblemRepository(supabase);
            const problems = await problemRepo.getAll();
            res.status(200).json(problems);
        } catch (error) {
            next(error);
        }
    }

    static async getProblemById(req, res, next) {
        try {
            const { id } = req.params;
            const problemRepo = new ProblemRepository(supabase);
            const problem = await problemRepo.getById(id);
            res.status(200).json(problem);
        } catch (error) {
            next(error);
        }
    }
    
    static async searchProblems(req, res, next) {
        const searchsmithUrl = 'http://localhost:8001/v1/search';
        try {
            const { query, tags, limit } = req.body;
            const response = await axios.post(searchsmithUrl, { query, tags, limit });
            res.status(200).json(response.data);
        } catch (error) {
            if (error.response) {
                res.status(error.response.status).json(error.response.data);
            } else {
                next(new Error("Failed to connect to SearchSmith service for search."));
            }
        }
    }

    static async createProblem(req, res, next) {
        try {
            const problemData = req.body;
            const problemRepo = new ProblemRepository(supabase);
            const supabaseService = new SupabaseService();

            // Logging for debug
            console.log('[CREATE_PROBLEM] Incoming:', {
                problem_id: problemData.problem_id,
                id: problemData.id,
                name: problemData.name
            });

            // Check if already exists
            let idToCheck = problemData.problem_id || problemData.id;
            let existing = null;
            if (idToCheck) {
                existing = await problemRepo.getById(idToCheck);
                if (existing) {
                    console.log('[CREATE_PROBLEM] Found existing problem:', existing.problem_id, existing.problem_name);
                }
            }
            let newProblem = existing;
            if (!existing) {
                newProblem = await problemRepo.create(problemData);
                if (newProblem && newProblem.problem_id) {
                    console.log('[CREATE_PROBLEM] Inserted new problem:', newProblem.problem_id, newProblem.problem_name);
                    const problemNameForFiles = problemData.name;
                    await supabaseService.uploadProblemFiles(
                        newProblem.problem_id,
                        problemNameForFiles,
                        problemData.statement,
                        problemData.solution
                    );
                    const configContent = JSON.stringify({
                        title: problemData.name,
                        timeLimit: problemData.timeLimit || 1000,
                        memoryLimit: problemData.memoryLimit || 256,
                        difficulty: problemData.difficulty,
                        note: problemData.note || "No specific notes."
                    }, null, 2);
                    await supabaseService.uploadProblemConfig(newProblem.problem_id, configContent);
                }
            }
            res.status(201).json(newProblem);
        } catch (error) {
            next(error);
        }
    }

    static async getUntaggedProblems(req, res, next) {
        try {
            const problemRepo = new ProblemRepository(supabase);
            const untaggedProblems = await problemRepo.findUntagged();
            res.status(200).json(untaggedProblems);
        } catch (error) {
            next(error);
        }
    }

    static async getProblemsFromStorage(req, res, next) {
        try {
            res.set("Cache-Control","no-store, no-cache, must-revalidate, proxy-revalidate");
            const supabaseService = new SupabaseService();
            const problems = await supabaseService.getProblemList();
            res.status(200).json(problems);
        } catch (error) {
            next(error);
        }
    }

    static async getProblemDetailsFromStorage(req, res, next) {
        try {
            const { problem_id } = req.params;
            const supabaseService = new SupabaseService();

            const configContent = await supabaseService.downloadProblemFile(problem_id, 'config.json');
            if (!configContent) {
                return res.status(404).json({ message: `Config file not found for problem ID: ${problem_id}` });
            }
            const problemConfig = JSON.parse(configContent);
            const problemNameFromConfig = problemConfig.title;

            const markdownContent = await supabaseService.downloadProblemFile(problem_id, `${problemNameFromConfig}.md`, false);
            const solutionCode = await supabaseService.downloadProblemFile(problem_id, `${problemNameFromConfig}.cpp`, true);

            let pdfFileName = null;
            try {
                const problemFiles = await supabaseService.listFilesInFolder(`${problem_id}/Problems`);
                const pdfFile = problemFiles.find(file => file.name.endsWith('.pdf'));
                if (pdfFile) {
                    pdfFileName = pdfFile.name;
                }
            } catch {
            }

            res.status(200).json({
                id: problem_id,
                name: problemNameFromConfig,
                statement: markdownContent,
                solution: solutionCode,
                difficulty: problemConfig.difficulty,
                timeLimit: problemConfig.timeLimit,
                memoryLimit: problemConfig.memoryLimit,
                note: problemConfig.note,
                tags: problemConfig.tags || [],
                pdfFileName: pdfFileName
            });
        } catch (error) {
            next(new Error("Failed to retrieve problem details from storage."));
        }
    }

    static async syncWithSearchsmith(req, res, next) {
        const searchsmithUrl = 'http://localhost:8001/v1/generate-only';
        try {
            const { problem_name, markdown_content, solution_code, problem_id } = req.body;
            const problemRepo = new ProblemRepository(supabase);
            const supabaseService = new SupabaseService();

            // Logging for debug
            console.log('[SYNC_SEARCHSMITH] Incoming:', {
                problem_id,
                problem_name
            });

            let problemInDb;
            try {
                problemInDb = await problemRepo.getById(problem_id);
                if (problemInDb) {
                    console.log('[SYNC_SEARCHSMITH] Found existing problem:', problemInDb.problem_id, problemInDb.problem_name);
                }
            } catch (dbGetError) {
                problemInDb = null;
            }

            if (!problemInDb) {
                const configContent = await supabaseService.downloadProblemFile(problem_id, 'config.json');
                if (!configContent) {
                    console.log('[SYNC_SEARCHSMITH] No config found for:', problem_id);
                    throw new Error(`Cannot create problem in DB: config.json not found for problem ID: ${problem_id}`);
                }
                const problemConfig = JSON.parse(configContent);
                const newProblemData = {
                    problem_id: problem_id,
                    name: problemConfig.title,
                    difficulty: problemConfig.difficulty || 0,
                };
                problemInDb = await problemRepo.createFromBucket(newProblemData);
                console.log('[SYNC_SEARCHSMITH] Inserted new problem from bucket:', problem_id, problemConfig.title);
            }

            // Call SearchSmith service ONLY for generating embeddings and tags
            // DO NOT let it insert into the database
            const searchsmithResponse = await axios.post(searchsmithUrl, {
                problem_name,
                markdown_content: markdown_content,
                solution_code: solution_code
            });
            
            if (searchsmithResponse.status !== 200) {
                throw new Error('SearchSmith service returned an unexpected status.');
            }

            const { tags, embedding: embedding_vector } = searchsmithResponse.data.result || {};

            // Update the existing Express server record with SearchSmith results
            const updates = {
                is_tagged: true,
                tags: tags || [],
                embedding: embedding_vector || null
            };

            await problemRepo.updateProblem(problem_id, updates);
            console.log('[SYNC_SEARCHSMITH] Updated problem:', problem_id, { is_tagged: true, tags, embedding: !!embedding_vector });

            // Return enhanced response with SearchSmith results
            const enhancedResponse = {
                ...searchsmithResponse.data,
                problem_id: problem_id,
                problem_name: problem_name,
                tags_generated: tags || [],
                embedding_generated: embedding_vector ? true : false,
                database_updated: true,
                message: `Problem "${problem_name}" successfully tagged and synced with SearchSmith`
            };

            res.status(200).json(enhancedResponse);
        } catch (error) {
            next(new Error("Failed to sync with SearchSmith service."));
        }
    }

    static async getSearchsmithResults(req, res, next) {
        const searchsmithUrl = 'http://localhost:8001/v1/query';
        try {
            const { query, tags, limit = 5 } = req.body;
            
            if (!query) {
                return res.status(400).json({ error: "Query parameter is required" });
            }

            const response = await axios.post(searchsmithUrl, { 
                query, 
                tags: tags || [], 
                limit 
            });
            
            if (response.status !== 200) {
                throw new Error('SearchSmith service returned an unexpected status.');
            }

            // Get detailed information about recommended problems
            const problemRepo = new ProblemRepository(supabase);
            const recommendedProblems = response.data.recommended_problems || [];
            
            const detailedResults = await Promise.all(
                recommendedProblems.map(async (problemName) => {
                    try {
                        const problem = await problemRepo.getByName(problemName);
                        return {
                            name: problemName,
                            problem_id: problem?.problem_id || null,
                            difficulty: problem?.difficulty || 0,
                            tags: problem?.tags || [],
                            similarity_score: null // SearchSmith doesn't return scores yet
                        };
                    } catch (error) {
                        return {
                            name: problemName,
                            problem_id: null,
                            difficulty: 0,
                            tags: [],
                            similarity_score: null
                        };
                    }
                })
            );

            res.status(200).json({
                query: query,
                tags_filter: tags || [],
                limit: limit,
                recommended_problems: detailedResults,
                total_found: detailedResults.length,
                searchsmith_response: response.data
            });
        } catch (error) {
            if (error.response) {
                res.status(error.response.status).json(error.response.data);
            } else {
                next(new Error("Failed to get SearchSmith results."));
            }
        }
    }

    static async cleanupDuplicates(req, res, next) {
        try {
            const problemRepo = new ProblemRepository(supabase);
            const cleanedRecords = await problemRepo.cleanupDuplicateRecords();
            res.status(200).json({ 
                message: "Duplicate records cleaned up successfully",
                cleaned_count: cleanedRecords?.length || 0
            });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = ProblemController;