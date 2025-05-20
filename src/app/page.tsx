"use client"

import {useState, useEffect} from "react"
import axios from 'axios';
import MyInput from "../components/my_input";
import MyForm from "../components/my_form";

const Home = () => {

const [username, setUsername] = useState("")
const [mode, setMode] = useState("closest")
const [loading, setLoading] = useState(false)
const [p1, setP1] = useState("")
const [p2, setP2] = useState("")
const [creation, setCreation] = useState("")
const [similarity, setSimilarity] = useState(0)


console.log('refresh')
const API = process.env.NEXT_PUBLIC_API_URL ? process.env.NEXT_PUBLIC_API_URL : process.env.NEXT_PUBLIC_API_URL_DEPLOYED
const axiosInstance = axios.create({
  baseURL: API,
  withCredentials: true,
});


useEffect(() => {console.log(API)}, [])

const add_user = (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault()
   console.log('adding user',username )
   console.log('adding user',loading )
  if (!loading && username) {
    setMode('create')
    setLoading(true)
    setCreation('creating...')
    const request_obj = {
    chess_username: username,
    platform: "chess.com",
    is_grandmaster: false
};
    axiosInstance.post('/create_username', request_obj)
      .then(response => {
        console.log(response.data.message)
        setCreation(response.data.message)
      })
      .finally(()=>setLoading(false));
  }
};

const player_similarity = (e: React.FormEvent<HTMLFormElement>) => {
   e.preventDefault()
   console.log('comparing players', p1)
   console.log('comparing players',loading )
  if (!loading && p1 && p2) {
    setMode('similarity')
    setLoading(true)
    axiosInstance.get(`/player_similarity?player1=${p1}&player2=${p2}`)
      .then(response => {
        setSimilarity(response.data.similarity)
      })
      .catch(error => {
        console.log('error in similarity')
        setSimilarity(0)
      })
      .finally(()=>setLoading(false));
  }
};

return (
<div className = "bg-black p-4 text-white font-mono">
  <h1 className="m-8 mb-16 text-4xl text-center">
    It's time we reap the benefits of advancements in AI to make chess more fun
  </h1>

  <div className = "flex flex-col items-center gap-12 w-screen">
    <div className = "flex flex-col items-center">
      <h2 className="mb-4">Enter your account into our database:</h2>
      <MyForm f = {add_user}>
        <MyInput f = {setUsername} value = {username} placeholder = "Chess.com username"/>
      </MyForm>
      {
        mode === "create" &&
        <div className = "text-green mt-2">
            {creation}
        </div>
      }
    </div>

    <div className = "flex flex-col items-center">
      <h2 className="mb-4">Quantify the similarity between any two players:</h2>
      <MyForm f = {player_similarity}>
        <MyInput f = {setP1} value = {p1} placeholder = "Player 1 username"/>
        <MyInput f = {setP2} value = {p2} placeholder = "Player 2 username"/>
      </MyForm>
      {
        mode === "similarity" &&
        (
          similarity == 0 ?
          <div className = "text-red-500 mt-2">
            Couldn't find at least one of the users. Please first add them to our database!
          </div> :
          <div className = "text-green-700 mt-2">
            Similarity score: {similarity.toFixed(2)}
          </div>
        )
      }
    </div>
  </div>
</div>
)

  
}

export default Home