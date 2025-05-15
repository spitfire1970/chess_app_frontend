"use client"

import {useState, useEffect} from "react"

const Home = () => {

const [username, setUsername] = useState("")

return (<div className = "bg-black">
<h1 className="text-center text-white">
  It's time we reap the benefits of advancements in AI to make chess more fun
</h1>
<input onChange = {(e) =>{setUsername(e.target.value)}} className = "bg-white" placeholder = "Enter Chess.com username"/>
</div>
)

  
}

export default Home