const firebase = require('firebase');
const dotenv = require('dotenv');
const {admin, db} = require('../db');
const {settings} = require('../config');
const {getUserDetail, isEmpty} = require('../middleware');



const firebaseConfig = {
    apiKey: settings.apiKey,
    authDomain: settings.authDomain,
    databaseURL: settings.databaseURL,
    projectId: settings.projectId,
    storageBucket: settings.storageBucket,
    messagingSenderId: settings.measurementId,
    appId: settings.appId,
    measurementId: settings.measurementId
};

  firebase.initializeApp(firebaseConfig);

exports.register = (req, res) => {
    const placeholder = 'placeholder.png'
    const {email, password, confirmPassword, handle} = req.body;
    let user, token;
    db.doc(`/users/${handle}`).get()
    .then(doc => {
        if(doc.exists){
            return res.status(400).json({
                status: res.statusCode,
                success: false,
                handle: 'this handle is already taken'
            })
        }else{
            return firebase
            .auth()
            .createUserWithEmailAndPassword(email, password);
        }
            
    }).then(data => {
        
        user = {
            id: data.user.uid,
            email: data.user.email,
            handle,
            imgUrl: `https://firebasestorage.googleapis.com/v0/b/${process.env.storageBucket}/o/${placeholder}?alt=media`,
            createdAt: new Date().toISOString()
        }
        return data.user.getIdToken();
    }).then(userToken => {
        token = userToken;
       
        return db.doc(`/users/${handle}`).set(user)
    }).then(() => {
         return res.status(201).json({
            status: res.statusCode,
            success: false,
            message: 'Account created successfully',
            user,
            token
        })
    }).catch(err => {
        console.error(err);
        if(err.code === "auth/email-already-in-use"){
            return res.status(400).json({
                status: res.statusCode,
                success: false,
                message: 'Email is already in use',
            })
        }
        return res.status(500).json({
            success: false,
            message: 'An error occured registering this user',
            error: err.code
        })
    });
    
}

exports.login = (req, res) => {
    const {email, password} = req.body;
    let user;
    
    firebase
    .auth()
    .signInWithEmailAndPassword(email, password)    
    .then(data => {
                
        return data.user.getIdToken();
    }).then(token => {
        return res.status(200).json({
            status: res.statusCode,
            success: true,
            message: 'login was successful',
            token
        })
    }).catch(err => {
        console.error(err);
        if(err.code === 'auth/user-not-found'){
            return res.status(400).json({
                status: res.statusCode,
                success: false,
                message: 'invalid email/password',
            })
        }
        if(err.code === 'auth/wrong-password'){
            return res.status(403).json({
                status: res.statusCode,
                success: false,
                message: 'invalid email/password',
            })
        }
        return res.status(500).json({
            status: res.statusCode,
            success: false,
            message: 'An error occured while trying to login',
            error: err.code
        })
    });
    
}

exports.addUserDetail = (req, res) => {
    const userDetail = getUserDetail(req.body);
    if(isEmpty(userDetail)) return res.status(400).json({
        status: res.statusCode,
        success: false,
        message: 'must contain field to update'
    });
    db.doc(`users/${req.user.handle}`).update(userDetail)
        .then(() => {
            return res.status(201).json({
                status: res.statusCode,
                success: true,
                message: 'user detail added sucessfully'
            });
        }).catch(err => {
            console.error(err);
            return res.status(500).json({
                status: res.statusCode,
                success: false,
                message: 'An error occured while adding user detail'
            });
        });
}

exports.getAuthenticatedUser = (req, res) => {
    const userData = {};
    db.doc(`/users/${req.user.handle}`).get()
        .then(doc => {
            if(doc.exists){
                userData.credential = doc.data();
                return db.collection('likes')
                    .where('userHandle', '==', req.user.handle)
                    .get()
                    .then()
            }
        }).then(data => {
            userData.likes = [];
            data.forEach(doc => {
                userData.likes.push(doc.data())
            });
            return db.collection('notifications').where('recipient', '==', req.user.handle).orderBy('createdAt', 'desc').limit(10).get();

        }).then((data) => {
            userData.notifications = [];
            data.forEach((doc) => {
                userData.notifications.push({
                    createdAt: doc.data().createdAt,
                    recipient: doc.data().recipient,
                    sender: doc.data().sender,
                    buzzId: doc.data().buzzId,
                    type: doc.data().type,
                    read: doc.data().read,
                    notificationId: doc.id
                });
            });
            return res.status(200).json({
                status: res.statusCode,
                success: true,
                userData,
            })
        })
        .catch(err => {
            console.error(err)
            return res.status(500).json({
                status: res.statusCode,
                success: false,
                message: 'An error occured while getting authenticated user'
            })
        })
}

exports.userDetail = (req, res) => {
    const userData = {};
    db.doc(`/users/${req.params.handle}`).get()
        .then(doc => {
            if(doc.exists){
                userData.user = doc.data();
                return db.collection('buzz').where('userHandle', '==', req.params.handle).orderBy('createdAt', 'desc').get();
            }else{
                return res.status(404).json({
                    status: res.statusCode,
                    error: 'user not found'
                })
            }
        }).then((data) => {
            userData.buzz = [];
            data.forEach((doc) => {
                userData.buzz.push({
                    buzzId: doc.id,
                    likeCount: doc.data().likeCount,
                    commentCount: doc.data().commentCount,
                    imgUrl: doc.data().imgUrl,
                    body: doc.data().body,
                    userHandle: doc.data().userHandle,
                    createdAt: doc.data().createdAt,
                });
            });
            return res.status(200).json({
                status: res.statusCode,
                success: true,
                userData,
            })
        })
        .catch(err => {
            console.error(err)
            return res.status(500).json({
                status: res.statusCode,
                success: false,
                message: 'An error occured while getting a user by handle'
            })
        })
}

exports.uploadImage = (req, res,) => {
    const path = require('path'),
    os = require('os'),
    fs = require('fs');
 
    const Busboy = require('busboy');
    const busboy = new Busboy({headers: req.headers});
    let imageToUpload = {};
    let filePath, imgName;
    busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {

        if(!['image/jpg', 'image/jpeg', 'image/png'].includes(mimetype)){
            return res.status(400).json({
                status: res.statusCode,
                error: 'wrong file type submitted'
            })
        }
        
        const imgExtension = filename.split('.')[filename.split('.').length - 1];
        imgName = `img-${Math.round(Math.random() * 10000000)}.${imgExtension}`;
        filePath = path.join(os.tmpdir(), imgName);
        imageToUpload = {
            filePath,
            mimetype
        }
        file.pipe(fs.createWriteStream(filePath))
    });
    busboy.on('finish', () => {
        admin.storage().bucket().upload(imageToUpload.filePath, {
            resumable: false,
            metadata: {
                metadata:{
                    contentType: imageToUpload.mimetype
                } 
            }
        }).then(data => {
            const imgUrl = `https://firebasestorage.googleapis.com/v0/b/${process.env.storageBucket}/o/${imgName}?alt=media`;
            return db.doc(`users/${req.user.handle}`).update({imgUrl});
        }).then(() => {
            return res.status(201).json({
                status: res.status,
                message: 'image uploaded successfully'
            })
        })
    });
    busboy.end(req.rawBody)
}

exports.markNotificationsRead = (req, res) => {
    let batch = db.batch();
    req.body.forEach((notificationId) => {
        const notification = db.doc(`notifications/${notificationId}`);
        batch.update(notification, {read: true})
    });
    batch.commit()
        .then(() => res.json({message: 'nofications marked read'}))
        .catch((err) => {
            console.error(err);
            return res.status(500).json({
                status: res.statusCode,
                error: 'Error occured trying to mark notifications read'
            });
        });
}