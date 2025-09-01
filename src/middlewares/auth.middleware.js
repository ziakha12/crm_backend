import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";


const verifyJwt = asyncHandler(async (req, _, next) => {
const token = req.cookies?.accessToken || req.header('authorization')?.replace('Bearer ', "");
    try {
        if (!token) {
            throw new ApiError(404, "unauthorized token")
        }

        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)

        if (!decodedToken) {
            throw new ApiError(404, "Invalid Access Token")
        }

        const user = await User.findById(decodedToken?._id).select('-password -refreshToken')
        if (!user) {

            throw new ApiError(401, "Invalid Access Token")
        }
        req.user = user;
        next()
    } catch (error) {
        throw new ApiError(401, "inavlid Access Token")
    }
})


export {verifyJwt}
