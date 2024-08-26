import mongoose from "mongoose"
import {Video} from "../models/video.model.js"
import {Subscription} from "../models/subscription.model.js"
import {Like} from "../models/like.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandeler.js"

// TODO: Get the channel stats like total video views, total subscribers, total videos, total likes etc.
const getChannelStats = asyncHandler(async (req, res) => {
    const userId = req.user?._id;

    const totalSubscribers = await Subscription.aggregate([
        {
            $match: {
                channel : new mongoose.Types.ObjectId(userId)
            }
        },
        {
            $group : {
                _id : null,
                totalSubscribersCount : {
                     $sum : 1 
                }
            }
        },
    ]);

    const video = await Video.aggregate([
        {
            $match : {
                owner : new mongoose.Types.ObjectId(userId)
            }
        },
        {
            $lookup : {
                from : "likes",
                localField : "_id",
                foreignField : "video",
                as : "likes"
            }
        },
        {
            $project : {
                totalLikes : {
                    $size : "$likes"
                },
                totalViews : "$views",
                totalVideos : 1
            }
        },
        {
            $group  :{
                _id : null,
                totalLikes : {
                    $sum : "$totalLikes"
                },
                totalViews : {
                    $sum : "$totalViews"
                },
                totalVideos : {
                    $sum : 1
                }

            }
        }
    ])

    const channelStatus = {
        totalSubscribers: totalSubscribers[0]?.totalSubscribersCount || 0,
        totalLikes: video[0]?.totalLikes || 0,
        totalViews: video[0]?.totalViews || 0,
        totalVideos : video[0]?.totalVideos || 0
    };

    return res
        .status(200)
        .json(new ApiResponse(
            200,
            channelStatus,
            "Channel status retrieved successfully")
        )
})

// TODO: Get all the videos uploaded by the channel
const getChannelVideos = asyncHandler(async (req, res) => {
    const userId = req.user?._id;
    
    const videos = await Video.aggregate([
        {
            $match: {
                owner : new mongoose.Types.ObjectId(userId)
            }
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "video",
                as: "likes"
            }
        },
        {
            $addFields : {
                totalLikes : { $size : "$likes" },
                createdAt : {
                    $dateToParts : {
                        date : "$createdAt",
                    }
                }
            }
        },
        {
            $sort : {
                createdAt : -1
            }
        },
        {
            $project: {
                _id: 1,
                "videoFile.url"  :1,
                "thumbnail.url" : 1,
                title: 1,
                description: 1,
                createdAt : {
                    year : 1,
                    month : 1,
                    day : 1
                },
                isPublished : 1,
                totalLikes : 1
            }
        }
    ])

    return res.status(200).json(new ApiResponse(200,videos,"channel start fetched successfully"))
})

export {
    getChannelStats, 
    getChannelVideos
    }