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
        res.status(404).json({ message: "Search endpoint should be proxied to SearchSmith service." });
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

            } else {
                console.warn('Problem created in DB but problem_id was not returned, skipping file upload.');
            }

            res.status(201).json(newProblem);
        } catch (error) {
            next(error);
        }
    }

    static async getProblemsFromStorage(req, res, next) {
        try {
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

            // Find PDF file dynamically
            let pdfFileName = null;
            try {
                const problemFiles = await supabaseService.listFilesInFolder(`${problem_id}/Problems`);
                const pdfFile = problemFiles.find(file => file.name.endsWith('.pdf'));
                if (pdfFile) {
                    pdfFileName = pdfFile.name;
                }
            } catch (listError) {
                console.warn(`Could not list PDF files for problem ${problem_id}:`, listError.message);
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
                pdfFileName: pdfFileName // Include the found PDF filename
            });

        } catch (error) {
            console.error('[Get Problem Details From Storage Error]', error.message);
            next(new Error("Failed to retrieve problem details from storage."));
        }
    }

    static async syncWithSearchsmith(req, res, next) {
        try {
            const { problem_name, markdown_content, solution_code, problem_id } = req.body;
            const problemRepo = new ProblemRepository(supabase);

            let problemInDb;
            try {
                problemInDb = await problemRepo.getById(problem_id);
            } catch (dbGetError) {
                if (dbGetError.code === 'PGRST116' && dbGetError.details === 'The result contains 0 rows') {
                    problemInDb = null;
                } else {
                    console.error('Error checking problem existence in DB:', dbGetError.message);
                    throw dbGetError;
                }
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

                try {
                    await problemRepo.createFromBucket(newProblemData);
                    console.log(`Problem ${problem_id} successfully added to database from bucket metadata.`);
                } catch (createError) {
                    console.error(`Failed to create problem ${problem_id} in database:`, createError.message);
                    throw new Error(`Failed to onboard problem ${problem_id} into database.`);
                }
            }

            let searchsmithResponse;
            try {
                searchsmithResponse = await axios.post('http://localhost:8001/v1/update-database', {
                    problem_name,
                    markdown_content: markdown_content,
                    solution_code: solution_code
                });
            } catch (axiosError) {
                if (axiosError.response) {
                    console.error('Error response from SearchSmith:', axiosError.response.data);
                    console.error('Error response status:', axiosError.response.status);
                } else if (axiosError.request) {
                    console.error('No response received from SearchSmith:', axiosError.request);
                } else {
                    console.error('Error setting up SearchSmith request:', axiosError.message);
                }
                throw new Error("Failed to sync with SearchSmith service due to API error.");
            }
            
            if (searchsmithResponse.status !== 200) {
                console.error('SearchSmith service returned non-200 status:', searchsmithResponse.status);
                console.error('SearchSmith response data:', searchsmithResponse.data);
                throw new Error('SearchSmith service returned an unexpected status.');
            }

            const { tags, embedding: embedding_vector } = searchsmithResponse.data.result || {};

            const updates = {
                is_tagged: true,
                tags: tags || [],
                embedding: embedding_vector || null
            };

            try {
                await problemRepo.updateProblem(problem_id, updates);
                console.log('Successfully updated problem metadata in Supabase table.');
            } catch (dbUpdateError) {
                console.error(`Failed to update problem ${problem_id} metadata in database:`, dbUpdateError.message);
                throw new Error("Failed to update problem metadata in database after SearchSmith sync.");
            }

            res.status(200).json(searchsmithResponse.data);

        } catch (error) {
            console.error('[Sync Error]', error.message);
            next(new Error("Failed to sync with SearchSmith service."));
        }
    }
}

module.exports = ProblemController;