import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js"
import { ApiResponse } from "../utils/apiResponse.js";
import { User } from "../models/user.model.js";

const generateTokens = async function(userId){
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({validateBeforeSave : false})

    return {refreshToken, accessToken}
}

const registerUser = asyncHandler(async (req, res)=>{
    const {phoneNumber, email, password, username} = req.body;

    if([phoneNumber, email, password].some(e => e?.trim() === "")){
        throw new ApiError(404, "All feilds are required")
    }

    const userCount = await User.countDocuments();

    let role = "user"

    if(userCount === 0){
        role = "admin"
    }

    console.log(userCount)
    
    const existedUser = await User.findOne({email})

    if(existedUser){
        throw new ApiError(401, "user already exist with same email or username")
    }

    const user = await User.create({
        phoneNumber,
        email,
        password,
        role : role,
        username
    })

    const RegisterUser = await User.findById(user._id).select('-password -refreshToken')

    return res.status(201)
    .json(new ApiResponse(200, RegisterUser, "user created successfully"))
})

const loginUser = asyncHandler(async (req, res) => {
    const {email , password} = req.body

    if(!email){
        throw new ApiError(404, 'all feilds are required')
    }

    const user = await User.findOne({email});
    console.log(user)

    if(!user){
        throw new ApiError(401, "user not found")
    }

    const isPasswordValid = await user.isPasswordCorrect(password)

    if(!isPasswordValid){
        throw new ApiError(401, "password is incorrect")
    }

    const {refreshToken, accessToken} = await generateTokens(user._id)

    const loggedInUser = await User.findById(user._id).select('-refreshToken -password')

    const options = {
        httpOnly : true,
        secure : true
    }

    return res.status(201)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(new ApiResponse(200, {
        user : loggedInUser,
        refreshToken,
        accessToken
    }, "user logged in successfully"))
    
})

const logoutUser = asyncHandler(async (req, res)=>{
    const user = req.user;

    await User.findByIdAndUpdate(
        user?._id,
        {
          $unset : {
            refreshToken : 1
          }  
        },
        {
            new : true
        }
    )

    const options = {
        httpOnly : true,
        secure : true
    }

    return res.status(201)
    .clearCookie('accessToken', options)
    .clearCookie('refreshToken', options)
    .json(new ApiResponse(200, {}, "user logout successfully"))

})


const getCurrentUser = asyncHandler(async (req, res) => {
    const user = req.user;
    return res.status(200)
    .json(new ApiResponse(200, user, "user fetched successfully"))
})

export {
    registerUser,
    loginUser,
    logoutUser,
    getCurrentUser
}