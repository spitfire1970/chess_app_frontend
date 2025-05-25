"use client"

import {useState} from "react"
import axios from 'axios';
import MyInput from "@/components/my_input";
import MyForm from "@/components/my_form";
import MyTable from "@/components/my_table";
import ChessBoard from "@/components/chessboard";


const Home = () => {

const [username, setUsername] = useState("")
const [username_gm, setUsername_gm] = useState("")
const [mode, setMode] = useState("closest")
const [loading, setLoading] = useState(false)
const [p1, setP1] = useState("")
const [p2, setP2] = useState("")
const [creation, setCreation] = useState("")
const [similarity, setSimilarity] = useState(0)
const [gm_list, setGm_list] = useState([])


console.log('refresh')
const API = '/api/proxy'
const axiosInstance = axios.create({
  baseURL: API,
  withCredentials: true,
});

const add_user = (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault()
  if (!loading && username) {
    setMode('create')
    setLoading(true)
    setCreation('creating player embedding...')
    const request_obj = {
    chess_username: username,
    platform: "chess.com",
    is_grandmaster: false
};
    axiosInstance.post('/create_username', request_obj)
      .then(response => {
        setCreation(response.data.message)
      })
      .finally(()=>setLoading(false));
  }
};

const closest_gms = (e: React.FormEvent<HTMLFormElement>) => {
   e.preventDefault()
  if (!loading && username_gm) {
    setMode('gms')
    setLoading(true)
    axiosInstance.get(`/similar_players/${username_gm}`)
      .then(response => {
        setGm_list(response.data.similar_players)
      })
      .catch(error => {
        console.log('error in closest gm')
        setGm_list([])
      })
      .finally(()=>setLoading(false));
  }
};

const player_similarity = (e: React.FormEvent<HTMLFormElement>) => {
   e.preventDefault()
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
<div className = "min-h-screen bg-black p-4 text-white font-mono md:text-justify text-center flex flex-col">
  <div className = "flex-grow">
    <h1 className="m-8 mb-16 text-2xl md:text-4xl text-center">
      It's time we reap the recent advancements in AI to make chess more interesting
    </h1>
    <div className = "flex flex-col md:flex-row items-center justify-evenly sm:mr-24">
      <div className = "flex flex-col items-center gap-12 w-screen">
        <div className = "flex flex-col items-center">
          <h2 className="mb-4">Enter Chess.com username<sup>*</sup>:</h2>
          <MyForm f = {add_user}>
            <MyInput f = {(e) => {setUsername(e); setMode("")}} value = {username} placeholder = "E.g. Hikaru (case sensitive)"/>
          </MyForm>
          {
            mode === "create" &&
            <div className = "text-green mt-2 w-8/10">
                {creation}. {!loading && <>Check out the {username}-styled bot below</>}
            </div>
          }
        </div>
        <div>
          <ChessBoard username = {username} mode = {mode}/>
        </div>
      </div>
      <div className = "flex flex-col gap-12 md:my-0 my-12 items-center">
        <div className = "flex flex-col items-center">
          <h2 className="mb-4">Find out the top 10 stylistically similar grandmasters as you (or someone else):</h2>
          <MyForm f = {closest_gms}>
            <MyInput f = {setUsername_gm} value = {username_gm} placeholder = "Chess.com username"/>
          </MyForm>
          {
            mode === "gms" &&
            (
              gm_list.length > 0 ?
            <div className = "text-white mt-2">
              <MyTable headings = {["Username", "Similarity"]} attribute_list = {["username", "similarity"]} entries = {gm_list} link = "https://chess.com/members/"/>
            </div> :
            <div className = "text-red-500 mt-2">
                Couldn't find this user in our database!
            </div>
            )
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
  </div>
  <footer className="flex flex-col gap-8 mb-4 mt-8 text-center">
    <div className="text-l">
    This uses the research and models I
    <sup className = "text-xs">(<a href="https://nakul.one"><text className="text-pumpkin hover:underline">@nakul.one</text></a>)</sup>
    &nbsp;trained during my dissertation project at UCL 🏛️!
    </div>
    <div className="text-xs">
      <sup>*</sup>You consent to the use of your chess.com game data for the generation of results for you (and potentially others)
    </div>
  </footer>
</div>

)
}

export default Home