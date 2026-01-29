import { openai, supabase } from './config.js';

const form = document.getElementById('form')
const reply = document.getElementById('reply')

const favorite = document.getElementById('favorite')
const mood = document.getElementById('mood')
const type = document.getElementById('type')

form.style.display = 'block'
reply.style.display = 'none'



const query = favorite + " " + mood + " " + type

form.addEventListener('submit', function(e){
    e.preventDefault()
    const query = `${favorite.value} ${mood.value} ${type.value}`
    main(query)
})

async function main(query){
    const embedCreated = await embedCreate(query)
    const match = await findNearestMatch(embedCreated)
    await recommend(match, query)
    
}

async function embedCreate(query){
    const embedding = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: query
    });
    return embedding.data[0].embedding;
}

async function findNearestMatch(embedCreated) {
    const { data }  = await supabase.rpc('match_movie_project', {
        query_embedding: embedCreated,
        match_threshold: 0.10,
        match_count: 1
    });
    console.log(data)
    return data
}

const message = [{
    role: 'system',
    content: `You are an enthusiastic movie expert who loves recommending movies to people.
    You will be given two pieces of information - some context about movies and a question.
    Your main job is to formulate a short answer to the question using the provided context.
    
    IMPORTANT: You must return the answer in this exact format:
    Movie Title (Year) :: Description

    Example:
    The Matrix (1999) :: A mind-bending sci-fi thriller about a computer hacker...`
}]

async function recommend(match, query){

    const context = match.map(movie => movie.content).join('\n---\n')
    message.push({
        role: 'user',
        content: `context: ${context}, question: ${query}`
    })

    const response = await openai.chat.completions.create({
    model: "gpt-4",
    messages: message
    });

    form.style.display = 'none'
    reply.style.display = 'flex'
    

    const responseText = response.choices[0].message.content
    console.log(responseText)
    const splitData = responseText.split(' :: ')
     console.log(splitData)
    const title = splitData[0] || "Recommendation"
     console.log(title)
    const description = splitData[1] || responseText
     console.log(description)
    reply.innerHTML = `
        <h2>${title}</h2>
        <p>${description}</p>
        <button id='again' onclick='location.reload()'>Go Again</button>
    `
}


