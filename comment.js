document.addEventListener('DOMContentLoaded', () => {
    const commentForm = document.getElementById('comment-form');
    const commentInput = document.getElementById('comment-input');
    const commentSection = document.getElementById('comment-section');
    const clearButton = document.getElementById('clear-comments');

    document.addEventListener('DOMContentLoaded', () => {
        const modalCloseBtn = document.getElementById('modal-close-btn');
        if (modalCloseBtn) {
            modalCloseBtn.addEventListener('click', testimonialsModalFunc);
        } else {
            console.log('modalCloseBtn not found');
        }
    });

    // Initialize Firestore
    const firebaseConfig = {
        apiKey: "AIzaSyA-BlB4rTOEMiCRi8ngVnnLVVellWTV69s",
        authDomain: "mycommentsapp-a08cf.firebaseapp.com",
        projectId: "mycommentsapp-a08cf",
        storageBucket: "mycommentsapp-a08cf.appspot.com",
        messagingSenderId: "1:675866901297:web:9b8c64f9dbfcf90ce34e10",
        appId: "1:675866901297:web:9b8c64f9dbfcf90ce34e10"
    };
    
    // Initialize Firebase
    firebase.initializeApp(firebaseConfig);
    
    // Initialize Firestore after Firebase is initialized
    const db = firebase.firestore();

    // Get the current user info from localStorage or create a new anonymous user
    let currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;
    let usernameCounter = parseInt(localStorage.getItem('usernameCounter')) || 100;

    if (!currentUser) {
        currentUser = {
            username: `Anonymous${usernameCounter++}`,
            avatar: getRandomAvatar()
        };
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        localStorage.setItem('usernameCounter', usernameCounter);
    }

    // Function to generate a random avatar
    function getRandomAvatar() {
        const randomText = Math.random().toString(36).substring(7);
        return `https://robohash.org/${randomText}?set=set1&size=50x50`;
    }

    // Function to create a comment element
    function createCommentElement(comment, isReply = false) {
        const commentDiv = document.createElement('div');
        commentDiv.classList.add(isReply ? 'reply' : 'comment');

        const header = document.createElement('div');
        header.classList.add('comment-header');

        const avatar = document.createElement('img');
        avatar.src = comment.avatar;
        avatar.alt = 'Avatar';
        avatar.classList.add('avatar');

        const usernameSpan = document.createElement('span');
        usernameSpan.classList.add('username');
        usernameSpan.textContent = comment.username;

        const timestampSpan = document.createElement('span');
        timestampSpan.classList.add('timestamp');
        // Convert Firestore timestamp to a human-readable date format
        timestampSpan.textContent = comment.timestamp.toDate().toLocaleString();

        header.appendChild(avatar);
        header.appendChild(usernameSpan);
        header.appendChild(timestampSpan);

        const content = document.createElement('p');
        content.textContent = comment.text;

        const actions = document.createElement('div');
        actions.classList.add('actions');

        const likeButton = document.createElement('button');
        likeButton.innerHTML = `👍 ${comment.likes}`;
        likeButton.classList.add('like-btn');
        likeButton.addEventListener('click', () => {
            if (!comment.votes.includes(currentUser.username)) {
                comment.likes++;
                comment.votes.push(currentUser.username);
                updateCommentInFirestore(comment.id, comment);
            } else {
                showVoteMessage(commentDiv, "You already voted!");
            }
        });

        const dislikeButton = document.createElement('button');
        dislikeButton.innerHTML = `👎 ${comment.dislikes}`;
        dislikeButton.classList.add('dislike-btn');
        dislikeButton.addEventListener('click', () => {
            if (!comment.votes.includes(currentUser.username)) {
                comment.dislikes++;
                comment.votes.push(currentUser.username);
                updateCommentInFirestore(comment.id, comment);
            } else {
                showVoteMessage(commentDiv, "You already voted!");
            }
        });

        const replyButton = document.createElement('button');
        replyButton.textContent = 'Reply';
        replyButton.classList.add('reply-btn');
        replyButton.addEventListener('click', () => {
            if (commentDiv.querySelector('.reply-form')) return;

            const replyForm = document.createElement('form');
            replyForm.classList.add('reply-form');

            const replyInput = document.createElement('input');
            replyInput.type = 'text';
            replyInput.placeholder = 'Write a reply...';
            replyInput.required = true;

            const sendReplyButton = document.createElement('button');
            sendReplyButton.type = 'submit';
            sendReplyButton.textContent = 'Send';

            replyForm.appendChild(replyInput);
            replyForm.appendChild(sendReplyButton);
            commentDiv.appendChild(replyForm);

            replyForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const replyText = replyInput.value.trim();
                if (replyText) {
                    const reply = {
                        id: Date.now(),
                        username: currentUser.username,
                        avatar: currentUser.avatar,
                        text: replyText,
                        timestamp: new Date().toLocaleString(),
                        likes: 0,
                        dislikes: 0,
                        votes: []
                    };
                    comment.replies.push(reply);
                    updateCommentInFirestore(comment.id, comment);
                    renderComments();
                }
            });
        });

        actions.appendChild(likeButton);
        actions.appendChild(dislikeButton);
        actions.appendChild(replyButton);

        commentDiv.appendChild(header);
        commentDiv.appendChild(content);
        commentDiv.appendChild(actions);

        if (comment.replies && comment.replies.length > 0) {
            const repliesDiv = document.createElement('div');
            repliesDiv.classList.add('replies');
            const sortedReplies = comment.replies.sort((a, b) => b.id - a.id);
            sortedReplies.forEach(reply => {
                repliesDiv.appendChild(createCommentElement(reply, true));
            });
            commentDiv.appendChild(repliesDiv);
        }

        return commentDiv;
    }

    // Function to update the comment in Firestore
    function updateCommentInFirestore(commentId, updatedComment) {
        db.collection('comments').doc(commentId).update(updatedComment);
    }

    // Function to load comments from Firestore
    function loadComments() {
        db.collection('comments')
            .orderBy('timestamp', 'desc')
            .onSnapshot((snapshot) => {
                commentSection.innerHTML = '';  // Clear current comments
                snapshot.forEach((doc) => {
                    const comment = doc.data();
                    comment.id = doc.id;  // Add Firestore document ID
                    commentSection.appendChild(createCommentElement(comment));
                });
            });
    }

    // Function to add a new comment
    commentForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const text = commentInput.value.trim();
        if (text !== '') {
            const newComment = {
                username: currentUser.username,
                avatar: currentUser.avatar,
                text: text,
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                likes: 0,
                dislikes: 0,
                votes: [],
                replies: []
            };

            const docRef = await db.collection('comments').add(newComment);
            commentInput.value = '';  // Clear the input field
        }
    });

    // Display a message if the user has already voted
    function showVoteMessage(commentDiv, message) {
        let existingMsg = commentDiv.querySelector('.vote-message');
        if (existingMsg) return;

        const msg = document.createElement('div');
        msg.classList.add('vote-message');
        msg.textContent = message;
        commentDiv.appendChild(msg);

        setTimeout(() => {
            msg.remove();
        }, 2000);
    }

    // Call loadComments to load and display comments when the page loads
    loadComments();
});
