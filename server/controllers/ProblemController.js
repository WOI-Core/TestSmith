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

            const newProblem = await problemRepo.create(problemData);
            
            if (newProblem && newProblem.problem_id) {
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

            res.status(201).json(newProblem);
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
        const searchsmithUrl = 'http://localhost:8001/v1/update-database';
        try {
            const { problem_name, markdown_content, solution_code, problem_id } = req.body;
            const problemRepo = new ProblemRepository(supabase);
            const supabaseService = new SupabaseService();

            let problemInDb;
            try {
                problemInDb = await problemRepo.getById(problem_id);
            } catch (dbGetError) {
                problemInDb = null;
            }

            if (!problemInDb) {
                const configContent = await supabaseService.downloadProblemFile(problem_id, 'config.json');
                if (!configContent) {
                    throw new Error(`Cannot create problem in DB: config.json not found for problem ID: ${problem_id}`);
                }
                const problemConfig = JSON.parse(configContent);
                
                const newProblemData = {
                    problem_id: problem_id,
                    name: problemConfig.title,
                    difficulty: problemConfig.difficulty || 0,
                };
                await problemRepo.createFromBucket(newProblemData);
            }

            const searchsmithResponse = await axios.post(searchsmithUrl, {
                problem_name,
                markdown_content: markdown_content,
                solution_code: solution_code
            });
            
            if (searchsmithResponse.status !== 200) {
                throw new Error('SearchSmith service returned an unexpected status.');
            }

            const { tags, embedding: embedding_vector } = searchsmithResponse.data.result || {};

            const updates = {
                is_tagged: true,
                tags: tags || [],
                embedding: embedding_vector || null
            };

            await problemRepo.updateProblem(problem_id, updates);

            res.status(200).json(searchsmithResponse.data);
        } catch (error) {
            next(new Error("Failed to sync with SearchSmith service."));
        }
    }
}

module.exports = ProblemController;