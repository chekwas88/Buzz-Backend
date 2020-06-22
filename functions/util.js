exports.deleteCommentsOnBuzz = (db, buzzId, userHandle) => {
    db.collection('comments').where('buzzId', '==', buzzId).where('userHandle', '==', userHandle).limit(100).get()
        .then(docs => {
            if(!docs.empty){
                const batch = db.batch();
                docs.forEach(doc => {
                    batch.delete(doc.ref)
                });
                batch.commit().then(() => {
                    docs.size
                }).then(() => {
                    this.deleteCommentsOnBuzz
                    process.nextTick(() => this.deleteCommentsOnBuzz(db, buzzId, userHandle));
                })
                .catch(err => {
                    console.error(err);
                    return {
                        status: 500,
                        success: false,
                        error: 'an error occured while trying to commit batch'
                    }
                })
            }
        }).catch(err => {
            console.error(err);
            return {
                status: 500,
                success: false,
                error: 'an error occured while trying to delete comments from a buzz'
            }
        })
}