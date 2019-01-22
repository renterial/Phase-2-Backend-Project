'use strict'
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//                      SEQUELIZE SETUP
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
const Sequelize = require('sequelize')
const {or, and, gt, gte, lt, lte, ne, notIn, in:opIn} = Sequelize.Op
const db = require('../models')


// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//                        EXPORTS
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
module.exports = {
    getAccountByEmail: (myEmail) => {
        return findAccountByEmail(myEmail)
    },
    getListOfProfiles: (myUserId) => {
        return findListOfProfiles(myUserId)
    },
    getProfileById: (myUserId) => {
        return findProfileById(myUserId)
    },
    getMatches: (myUserId) => {
        // Get user's matches
    },
    createALikeDBEntry: (myUserId, theirUserId, liked) => {
        console.log(myUserId, theirUserId, liked)
        return upsertLike(myUserId, theirUserId, liked)
    },
    createProfileData: (profiledata, account) => {
        return createProfileData(profiledata, account)
    }
}


// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//                      OFFLINE TESTS
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

// const email = 'gmcilhatton0@google.ca'

// findListOfProfiles(3)

// findSeenProfiles(3)
    // .then(function(result){console.log(result)})

// upsertLike(500, 300, false)

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//                      SEQUELIZE FUNCTIONS
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

function findAccountByEmail (email) {
    return db.account.findOne({
        where: {email:email}
    })
}

function findProfileById (id) {
    return db.profiledata.findOne({where: {userid:id}})
        .then(function(userData){
            userData.age = getAge(userData.birthday)
            return userData
        })
}

function findSeenProfilesById (myUserId) {
    return db.like.findAll({
        where: {
            userid_A:myUserId
        }
    })
    .then(function(resultArray){
        var userBArray = []
        resultArray.forEach(function (object) {
            userBArray.push(object.userid_B)
            // console.log(userBArray)
        })
        return userBArray
    })
}

function findListOfProfiles (myUserId){
    return findProfileById(myUserId)
            .then(function(myData){
                return findSeenProfilesById(myData.userid)
                .then(function(seenArr){return filterProfilesByPreferences(myData, seenArr)})
            })
            .then(function(resultArray){
                resultArray.forEach(function (object) {
                    object.age = getAge(object.birthday)
                    console.log(object.f_name, object.l_name, object.gender, object.age, object.birthday,object.city)
                })
                return resultArray[0]
            })
}

function filterProfilesByPreferences(myData, seenArr){
    if(!seenArr){seenArr=[]}
    const myAge = getAge(myData.birthday)
    const newestBirthdate = getBirthday(myData.pref_age_min)
    const oldestBirthdate = getBirthday(myData.pref_age_max)
    console.log('My name is',myData.f_name, myData.l_name, ', I am a',myAge,'year old',myData.gender,'living in',myData.city,'and I am looking for a',myData.pref_gender,'born between the dates of',oldestBirthdate,'and',newestBirthdate)
    
    // Create Gender Arrays
    var myGenderArr
    if (myData.gender=='B'){
        myGenderArr = ['M','F','B']
    } else {
        myGenderArr = [myData.gender, 'B']
    }
    var prefGenderArr
    if (myData.pref_gender=='B') {
        prefGenderArr=['M','F','B']
    } else {
        prefGenderArr=[myData.pref_gender]
    }
    console.log(myGenderArr, prefGenderArr)

    // Run Sequelize Query to find users that match my preferences and I match theirs
    return db.profiledata.findAll({
        where: {
            city: myData.city,
            gender: {
                [or]: [prefGenderArr]
            },
            birthday: {$between: [oldestBirthdate,newestBirthdate]},
            pref_gender: {
                [or]: [myGenderArr]
            }, 
            pref_age_min: {[lte]:myAge},
            pref_age_max: {[gte]:myAge},
            userid: {
                [ne]:myData.userid,
                [notIn]: seenArr
            }
        }
    })
}


function createProfileData(profiledata, account){
    db.profiledata.create({
    userid: account.id,
    f_name: profiledata.first_name,
    gender: profiledata.genderOptions,
    //     //profile_picture: userProfile.profile_picture
    birthday: profiledata.birthday
    })
}

function upsertLike(myUserId, theirUserId, liked) {
    return db.like
        .findOne({ where: {
            userid_A: myUserId,
            userid_B: theirUserId
        }})
        .then(function(obj) {
            if(obj) { // update
                return obj.update({
                    liked: liked
                })
            }
            else { // insert
                return db.like.create({
                    userid_A: myUserId,
                    userid_B: theirUserId,
                    liked: liked
                })
            }
        })



// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//                UTILITY FUNCTIONS
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

function getAge(dateString) {
    var today = new Date()
    var birthDate = new Date(dateString)
    var age = today.getFullYear() - birthDate.getFullYear()
    var m = today.getMonth() - birthDate.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--
    }
    return age
}

function getBirthday(age) {
    var agems = age*365*24*60*60*1000
    var today = new Date()
    var birthDate = new Date(today.getTime() - agems)
    return birthDate.getFullYear()+'-'+(1+birthDate.getMonth())+'-'+birthDate.getDate()
}

  
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//                SEQUELIZE REFERENCE QUERIES
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

// db.accounts.findAll()
//     .then((results) => {
//         results.forEach(function(index){
//             console.log(index.userid, index.f_name)
//         })
//     })

// models.post.findByID(10).then(function(post){
//     console.log(post)
// })

// db.accounts.create({email:'testemail@email.com',password:'this-is-a-password-hash'})
// .then(function(user){
//     console.log(user)
// })

// db.accounts.findAll({where: {l_name: 'Ashard'}})
//   .then((results) => {
//     results.forEach(function(index){
//             console.log(index.userid, index.f_name, index.l_name);
//         })
//   });
