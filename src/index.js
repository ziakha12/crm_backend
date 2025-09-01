import {configDotenv} from 'dotenv'
import { dbConnect } from './db/index.js'
import { app } from './app.js'

configDotenv({
    path : './.env'
})

dbConnect()
    .then(()=>{
        app.on('error',(error)=>{
            console.log('error in dbConnect.then app.on')
        })
        app.listen(process.env.PORT, ()=>{
            console.log('app is running on ', process.env.PORT)
        })
    })

