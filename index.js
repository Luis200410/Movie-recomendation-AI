
import { openai, supabase, moviesAPI} from './config.js';

const peopleForm = document.getElementById('people')
const numPeople =  document.getElementById('number')
const time =  document.getElementById('time')
const userForms = document.getElementById('userForms')
const header = document.getElementById('header')

peopleForm.addEventListener('submit', function(e){
    e.preventDefault()
    peopleForm.style.display = ' none'
    assigner()
})


let currentUserIndex = 0 
let totalUsers = 0 
let allAnswers = []

const reply = document.getElementById('reply')

reply.style.display = 'none'

function assigner(){
    totalUsers = parseInt(numPeople.value)
    currentUserIndex = 0
    allAnswers = []
    renderCurrentForm()
}

function renderCurrentForm(){

    userForms.innerHTML = ""

    if(currentUserIndex >= totalUsers){
        checkAnswers()
        return
    }

    const title = document.getElementById('title')
    title.textContent = `${currentUserIndex + 1} of ${totalUsers}`

    const buttonText = (currentUserIndex === totalUsers -1) ? "Get Movie" : "Next Person"

        userForms.innerHTML += `
                <form id="form" class="form">
                    <div class="favorite"> 
                        <label for="favorite">What’s your favorite movie and why?</label>
                        <textarea id="favorite" type="text" placeholder="The Shawshank Redemption Because it taught me to never give up hope no matter how hard life gets" required></textarea>
                    </div>
                    <div >
                        <div>
                            <p>Are you in the mood of something classic?</p>
                            <div class="moodContainer">
                                <div>
                                    <label for="new">New</label>
                                    <input type="radio" name="mood" value="new" id="new" required/>
                                </div>
                                <div>
                                    <label for="classic">Classic</label>
                                    <input type="radio" name="mood" value="classic"id="classic" />
                                </div>
                            </div>
                        </div>
                    </div>
                    <div>
                        <p>What are you in the mood for?</p>
                        <div class="typeContainer"> 
                            <div>
                                <label for="fun">Fun</label>
                                <input type="radio" name="type" value="fun"  id="fun" required/>
                            </div>
                            <div>
                                    <label for="serious">Serious</label>
                                <input type="radio" name="type" value="serious" id="serious" />
                            </div>
                            <div>
                                    <label for="inspiring">Inspiring</label>
                                <input type="radio" name="type" value="inspiring"  id="inspiring" />
                            </div>
                            <div>
                                <label for="scary">Scary</label>
                                <input type="radio" name="type" value="scary" id="scary" />
                            </div>
                        </div>
                    </div>
                    <div class="island"> 
                        <label for="island">Which famous film person would you love to be stranded on an island with and why?</label>
                        <textarea id="island" type="text" placeholder="Tom Hanks because he is really funny and can do the voice of Woody" required></textarea>
                    </div>
                    <button type="submit" id="submit">${buttonText}</button>
                </form>
            </div>
            `

            document.getElementById('form').addEventListener('submit', handleNextClick)
}

function handleNextClick(e){
    e.preventDefault()
    const favorite = document.getElementById('favorite').value
    const mood = document.querySelector('input[name="mood"]:checked').value
    const type = document.querySelector('input[name="type"]:checked').value
    const island = document.getElementById('island').value

    console.log(favorite, mood, type, island)

    allAnswers.push({
        user: currentUserIndex + 1,
        favoriteUser: favorite,
        moodUser: mood,
        typeUser: type,
        islandUser: island
    })

    currentUserIndex++

    renderCurrentForm()
}

function checkAnswers(){
    allAnswers.map(prompt => {
        console.log(prompt)
        const query = `${prompt.user} ${prompt.favoriteUser} ${prompt.moodUser} ${prompt.typeUser} ${prompt.islandUser}`
        console.log(query)
        main(query)
    })
    console.log(allAnswers)
    
}


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
    Movie Title :: (year) Description

    Example:
    The Matrix :: (1999) A mind-bending sci-fi thriller about a computer hacker...`
}]

let answers = []

async function recommend(match, query){

    const context = match.map(movie => movie.content).join('\n---\n')
    message.push({
        role: 'user',
        content: `context: ${context}, question: ${query}, time: ${time}`
    })

    const response = await openai.chat.completions.create({
    model: "gpt-4",
    messages: message
    });

    reply.style.display = 'flex'
    
    const responseText = response.choices[0].message.content
    const splitData = responseText.split(' :: ')
    const title = splitData[0] || "Recommendation"
    const description = splitData[1] || responseText

    const movieAI =  {
        titleAI: title, 
        descriptionAI: description
    }

    answers.push(movieAI)
    fetchPosterAndRender()
}

let answerIndex = 0 

async function fetchPosterAndRender(){

    if (answerIndex >= answers.length){
        return 
    }

    let currentAnswerIndex = answers[answerIndex]

    try{
        const responseMovie = await fetch(`http://www.omdbapi.com/?apikey=${moviesAPI}&t=${currentAnswerIndex.titleAI}`)
        const dataMovie = await responseMovie.json()
        console.log(responseMovie)

        const buttonAnswer = answerIndex === answers.length - 1 ? 'Start Over' : 'Next Recommendation'
            reply.innerHTML = `
                <h1>${dataMovie.Title} (${dataMovie.Year})</h1>
                <img src=${dataMovie.Poster} alt="Poster of the movie" />
                <p>${currentAnswerIndex.descriptionAI}</p>
                <button id="next-answer">${buttonAnswer}</button>
            `

            document.getElementById('next-answer').addEventListener('click', ()=>{
                if (answerIndex === answers.length - 1) {
                    resetApp() 
                } else {
                    answerIndex++
                    fetchPosterAndRender()
                }
            })
        }
    catch (err){
        console.error('The error is:', err)
    }
}

function resetApp() {
    currentUserIndex = 0 
    totalUsers = 0 
    answerIndex = 0
    
    allAnswers = [] 
    reply.innerHTML = ""             
    reply.style.display = 'none'    
    userForms.innerHTML = ""         
    peopleForm.style.display = 'block'     
    document.getElementById('number').value = "" 
}
