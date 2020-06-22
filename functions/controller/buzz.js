const {db} = require('../db');
const {deleteCommentsOnBuzz} = require('../util');

exports.getAllBuzz = (req, res) => {
    db.collection('buzz')
        .orderBy('createdAt', 'desc')
        .get()
            .then(docs => {
                if(!docs) return res.json({message: 'no buzz found', status: 404});
                let buzz = [];
                docs.forEach(doc => {
                    buzz.push({
                        id: doc.id,
                        likeCount: doc.data().likeCount,
                        commentCount: doc.data().commentCount,
                        imgUrl: doc.data().imgUrl,
                        body: doc.data().body,
                        userHandle: doc.data().userHandle,
                        createdAt: doc.data().createdAt,
                    })
                });
                return res.json({
                    status: 200,
                    success: true,
                    buzz,
                    
                })
            }).catch(err => {
                console.error(err)
                return res.status(500).json({
                    status: res.statusCode,
                    success: false,
                    error: err
                })
            }); 
}

exports.getBuzz = (req, res) => {
    let buzz = {};
    db.doc(`buzz/${req.params.buzzId}`).get()
        .then(doc => {
            if(!doc.exists){
                return res.status(404).json({
                    status: res.statusCode,
                    success: false,
                    error: 'buzz not found'
                })
            }
            buzz = doc.data();
            buzz.id = doc.id
            return db.collection('comments').where('buzzId', '==', req.params.buzzId).orderBy('createdAt', 'desc').get();
        }).then(data => {
            buzz.comments = [];
            data.forEach(doc => {
                console.log("idddd",doc.id)
                let comment = {
                    id: doc.id,
                    ...doc.data()
                }
                buzz.comments.push(comment);
            });
            return res.status(200).json({
                status: res.statusCode,
                success: true,
                buzz
            })
        }).catch(err => {
            console.error(err)
            return res.status(500).json({
                status: res.statusCode,
                success: false,
                error: 'an error occured while creating a buzz'
            })
        })
}

exports.createBuzz = (req, res) => {
    const {body} = req.body;
    const newBuzz = {
        body,
        userHandle: req.user.handle,
        userImage: req.user.imgUrl,
        likeCount: 0,
        commentCount: 0,
        createdAt: new Date().toISOString()
    }
    
    db.collection('buzz').add(newBuzz)
        .then(doc => {
            
            return res.json({
                status: 201,
                success: true,
                message: `success creating ${doc.id}`, 
            })
        }).catch(err => {
            console.error(err)
            return res.status(500).json({
                status: res.statusCode,
                success: false,
                error: 'an error occured while creating a buzz'
            })
        });
}

exports.likeBuzz = (req, res) => {
    const likeDoc = db.collection('likes').where('userHandle', "==", req.user.handle)
        .where('buzzId', '==', req.params.buzzId).limit(1);

    const buzzDoc = db.doc(`buzz/${req.params.buzzId}`); 

    let buzzData;

    buzzDoc.get()
        .then(doc => {
            if(doc.exists){
                buzzData = doc.data();
                buzzData.buzzId = doc.id;
                return likeDoc.get();
            }else{
                return res.status(404).json({
                    status: res.statusCode,
                    success: false,
                    error: 'document not found'
                })
            }
        }).then(data => {
            if(data.empty){
                db.collection('likes').add({
                    buzzId: req.params.buzzId,
                    userHandle: req.user.handle,
                }).then(() => {
                    buzzData.likeCount++;
                    return buzzDoc.update({likeCount: buzzData.likeCount})
                }).then(() => {
                    return res.status(200).json({
                        status: res.statusCode,
                        success: true,
                        buzz: buzzData,
                        message: 'liked'
                    })
                }).catch(err => {
                    console.error(err);
                    return res.status(500).json({
                        status: res.statusCode,
                        success: false,
                        error: 'An error occured while trying to like a buzz'
                    })
                })
            }else{
                buzzData.likeCount--;
                const likePath = data.docs[0].id;
                return buzzDoc.update({likeCount: buzzData.likeCount})
                .then(() => {
                    return db.doc(`likes/${likePath}`).delete()
                        
                }).then(() => {
                    return res.status(200).json({
                        status: res.statusCode,
                        success: true,
                        buzz: buzzData,
                        message: 'unliked'
                    })
                }).catch(err => {
                    console.error(err);
                    return res.status(500).json({
                        status: res.statusCode,
                        success: false,
                        error: 'An error occured while trying to unlike a buzz'
                    });
                })
            }
        }).catch(err => {
            console.error(err);
                    return res.status(500).json({
                        status: res.statusCode,
                        success: false,
                        error: 'something went wrong... fatal error'
                    })
        })
}

exports.commentOnBuzz = (req, res) => {
    if(!req.body.comment || req.body.comment.trim() === '') return res.status(400).json({
        status: res.statusCode,
        success: false,
        error: 'comment should not be empty'
    });

    const newComment = {
        buzzId: req.params.buzzId,
        body: req.body.comment,
        userHandle: req.user.handle,
        userImage: req.user.imgUrl,
        createdAt: new Date().toISOString()

    }
    db.doc(`buzz/${req.params.buzzId}`).get()
    .then(doc => {
        if(!doc.exists){
            return res.status(404).json({
                status: res.statusCode,
                success: false,
                error: 'buzz not found'
            })
        }
        return doc.ref.update({commentCount: doc.data().commentCount + 1}) 
    }).then(() => {
        return db.collection('comments').add(newComment)
    }).then(data => {
        return res.status(201).json({
            status: res.statusCode,
            success: true,
            comment: newComment,
        })
    }).catch(err => {
        console.error(err);
        return res.status(500).json({
            status: res.statusCode,
            success: false,
            error: 'an error occured while trying to create comment'
        })
    })
}

exports.deleteBuzz = (req, res) => {
   
    let deletedBuzz;
    const buzzDoc = db.doc(`buzz/${req.params.buzzId}`);
    buzzDoc.get()
    .then(doc => {
        if(doc.exists){
             if(doc.data().userHandle !== req.user.handle){
                return res.status(403).json({
                    status: res.statusCode,
                    success: false,
                    error: 'unAuthorized'
                })
            }
            deletedBuzz = doc.data();
            return buzzDoc.delete()
            .then(() => {
                return res.status(200).json({
                    status: res.statusCode,
                    success: true,
                    buzz: deletedBuzz,
                    message: 'buzz deleted successfully'
                });
            });
        } else {
            return res.status(404).json({
                status: res.statusCode,
                success: false,
                error: 'buzz not found'
            })
        }    
    })
    .catch(err => {
        console.error(err);
        return res.status(500).json({
            status: res.statusCode,
            success: false,
            error: 'an error occured while trying to delete buzz'
        })
    })
}


exports.deleteCommentOnBuzz = (req, res) => {
    
    let buzzId;
    db.doc(`/comments/${req.params.commentId}`).get()
    .then((doc) => {
        if(doc.exists){
            if(doc.data().userHandle === req.user.handle){
                buzzId = doc.data().buzzId;
                return doc.ref.delete().then(() => {
                    return db.doc(`/buzz/${buzzId}`).get()
                }).then((doc) => {
                    if(!doc.exists){
                        return res.status(404).json({
                            status: res.statusCode,
                            success: false,
                            error: 'buzz not found'
                        })
                    }
                    return doc.ref.update({commentCount: doc.data().commentCount - 1})
                }).then(() => {
                    return res.status(200).json({
                        status: res.statusCode,
                        success: true,
                        message: 'comment deleted successfully'
                    })
                })
                
            }
            return res.status(403).json({
                status: res.statusCode,
                success: false,
                error: 'You are not Authorized to perform this action'
            })
            
        }else{
            return res.status(404).json({
                status: res.statusCode,
                success: false,
                error: 'comment not found'
            })
        }
       
    })
    .catch(err => {
        console.error(err);
        res.status(200).json({
            status: res.statusCode,
            success: true,
            error: 'An error occured while trying to delete a comment'
        });
    });
    
}