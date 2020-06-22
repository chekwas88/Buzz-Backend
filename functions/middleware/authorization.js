const {db, admin} = require('../db');


const tokenAuthorization = (req, res, next) => {
    let token;
    if(req.headers && req.headers.authorization && req.headers.authorization.startsWith('Bearer')){
        token = req.headers.authorization.split(' ')[1];
    }else {
        return res.status(403).json({
            status: res.statusCode,
            error: 'You are not authorized to access this resource'
        })
    }
    admin.auth().verifyIdToken(token)
        .then(decoded => {
            req.user = decoded
            
            return db.collection('users')
                .where('id', '==', req.user.uid)
                .limit(1)
                .get();
        }).then(data => {
            req.user.handle = data.docs[0].data().handle;
            req.user.imgUrl = data.docs[0].data().imgUrl;
            
            return next();
        }).catch(err => {
            console.error(err);
            return res.status(403).json({
                status: res.statusCode,
                error: err
            })
        })
    
}

module.exports = tokenAuthorization;