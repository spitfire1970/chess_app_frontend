"use client"

import {useState, useEffect} from "react"
import axios from 'axios';
import MyInput from "../components/my_input";
import MyForm from "../components/my_form";

const Home = () => {

const [username, setUsername] = useState("")
const [mode, setMode] = useState("closest")
const [loading, setLoading] = useState(false)


const add_quote = () => {
  if (!loading && username) {
    setLoading(true);
    const request_obj = {
    chess_username: username,
    platform: "chess.com",
    is_grandmaster: false
};
    axios.post('http://localhost:8000/create_username', request_obj)
      .then(response => {
        console.log(response.data.message)
        setLoading(false);
      });
  }
};

return (<div className = "bg-black p-5">
<h1 className="text-center text-white font-mono text-4xl">
  It's time we reap the benefits of advancements in AI to make chess more fun
</h1>
<MyForm f = {add_quote}>
  <MyInput f = {setUsername} value = {username} placeholder = "Enter Chess.com username"/>
</MyForm>

</div>
)

  
}

export default Home