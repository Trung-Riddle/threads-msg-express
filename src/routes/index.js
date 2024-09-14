import { internalServerError, notFound } from "../middlewares/handleError";
import userRouter from './user.routes'
import postRouter from './post.routes'
import messageRouter from './message.routes'

const appRoute = (app) => {
    app.use('/api/users', userRouter)
    app.use('/api/posts', postRouter)
    app.use('/api/messages', messageRouter)


    app.use(notFound)
    app.use(internalServerError)
}
export default appRoute