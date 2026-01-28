import { openai, supabase } from './config.js';
import data from './content.js'

async function createAndStoreEmbeds(data){
    const dataReturned = await Promise.all(
        data.map(async (movie) => {
            const embeddingResponse = await openai.embeddings.create({
            model: "text-embedding-3-small",
            input: movie.content,
            });
            return {
                content: movie.content,
                embedding: embeddingResponse.data[0].embedding
            }
        })
    )
    await supabase.from('movie_project').insert(data)
}

