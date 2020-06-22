const functions = require('firebase-functions');
const express = require('express');
const {db} = require('./db');
const {loginValidator, signUpValidator, passswordMatch, authorization} = require('./middleware');
const {getAllBuzz, createBuzz, getBuzz, commentOnBuzz, likeBuzz, deleteBuzz, deleteCommentOnBuzz} = require('./controller/buzz');
const {register, login, uploadImage, addUserDetail, getAuthenticatedUser, userDetail, markNotificationsRead} = require('./controller/user');

const app = express()

// buzz routes
app.get('/buzz', authorization, getAllBuzz);
app.get('/buzz/:buzzId',  getBuzz);
app.delete('/buzz/:buzzId', authorization, deleteBuzz);
app.post('/buzz', authorization, createBuzz);
app.post('/buzz/:buzzId/comment', authorization, commentOnBuzz);
app.delete('/comments/:commentId', authorization, deleteCommentOnBuzz);
app.post('/buzz/:buzzId/like', authorization, likeBuzz);




// user routes
app.get('/user', authorization, getAuthenticatedUser);
app.patch('/user', authorization, addUserDetail);
app.get('/user/:handle', userDetail);
app.patch('/user/upload', authorization, uploadImage);
app.post('/register', signUpValidator, passswordMatch, register );
app.post('/login', loginValidator, login );
app.post('/notifications',authorization, markNotificationsRead)


exports.api = functions.https.onRequest(app);

exports.deleteNotificationOnUnlike = functions.firestore.document('likes/{id}')
    .onDelete((snapshot) => {
        return db.doc(`notifications/${snapshot.id}`).delete()
            .catch((err) => {
                console.error(err);
            });
    });

exports.deleteNotificationOnComment = functions.firestore.document('comments/{id}')
    .onDelete((snapshot) => {
    db.doc(`notifications/${snapshot.id}`).delete()
        .catch((err) => {
            console.error(err);
        });
    });

exports.createNotificationOnLike = functions.firestore.document('likes/{id}')
    
    .onCreate((snapshot) => {
       
       return  db.doc(`buzz/${snapshot.data().buzzId}`).get()
            .then((doc) => {
                if(doc.exists && (doc.data().userHandle === snapshot.data().userHandle)){
                    return db.doc(`notifications/${snapshot.id}`).set({
                        createdAt: new Date().toISOString(),
                        recipient: doc.data().userHandle,
                        sender: snapshot.data().userHandle,
                        buzzId: doc.id,
                        type: 'like',
                        read: false
                    })
                }
            })
            .catch((err) => {
                console.error(err);
              
            })
    });

    exports.createNotificationOnComment = functions.firestore.document('comments/{id}')
    
    .onCreate((snapshot) => {
        
       return db.doc(`buzz/${snapshot.data().buzzId}`).get()
            .then((doc) => {
                if(doc.exists &&  (doc.data().userHandle === snapshot.data().userHandle)){
                    return db.doc(`notifications/${snapshot.id}`).set({
                        createdAt: new Date().toISOString(),
                        recipient: doc.data().userHandle,
                        sender: snapshot.data().userHandle,
                        buzzId: doc.id,
                        type: 'comment',
                        read: false
                    })
                }
            })
            .catch((err) => {
                console.error(err);
            })
    });

    exports.onUserImageChange = functions.firestore.document('users/{id}')
    
    .onUpdate((change) => {
        let batch = db.batch();
        if(change.before.data().imgUrl !== change.after.data().imgUrl){
            return db.collection('buzz').where('userHandle', '==', change.before.data().handle).get()
            .then((data) => {
                data.forEach((doc) => {
                    const buzz = db.doc(`buzz/${doc.id}`);
                    batch.update(buzz, {imgUrl: change.after.data().imgUrl})
                });
                return batch.commit();
            }).catch((err) => {
                console.error(err);
            })
        }
        return false;
    });

    exports.onDeleteBuzz = functions.firestore.document('buzz/{id}')
    
    .onDelete((snapshot, context) => {
        console.log("my context",context.params)
        let buzzId = context.params.id
        let batch = db.batch();
        
            return db.collection('comments').where('buzzId', '==', buzzId).get()
            .then((data) => {
                data.forEach((doc) => {
                    batch.delete(db.doc(`comments/${doc.id}`))
                });
                return db.collection('notifications').where('buzzId', '==', buzzId).get()
                
            }).then((doc) => {
                data.forEach((doc) => {
                    batch.delete(db.doc(`notifications/${doc.id}`))
                });
                return db.collection('likes').where('buzzId', '==', buzzId).get()

            }).then((doc) => {
                data.forEach((doc) => {
                    batch.delete(db.doc(`likes/${doc.id}`))
                });
                return batch.commit();
            }).catch((err) => {
                console.error(err);
            })
        
    });