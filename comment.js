document.addEventListener('DOMContentLoaded', () => {
    const commentForm = document.getElementById('comment-form');
    const commentInput = document.getElementById('comment-input');
    const commentSection = document.getElementById('comment-section');
    const clearButton = document.getElementById('clear-comments');

    let comments = [];
    let currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;
    let votes = JSON.parse(localStorage.getItem('votes')) || {};

    // Firebase setup
    firebase.initializeApp(firebaseConfig);
    const db = firebase.firestore();

    function getRandomAvatar() {
        const randomText = Math.random().toString(36).substring(7);
        return `https://robohash.org/${randomText}?set=set1&size=50x50`;
    }

    // If no user is saved in localStorage, create a new anonymous user
    if (!currentUser) {
        currentUser = {
            username: `Anonymous${Date.now()}`,
            avatar: getRandomAvatar(),
        };
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
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
        timestampSpan.textContent = new Date(comment.timestamp.seconds * 1000).toLocaleString();

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
            if (!votes[comment.id]) {
                comment.likes++;
                votes[comment.id] = 'liked';
                saveVotes();
                renderComments();
            } else {
                showVoteMessage(commentDiv, "You already voted!");
            }
        });

        const dislikeButton = document.createElement('button');
        dislikeButton.innerHTML = `👎 ${comment.dislikes}`;
        dislikeButton.classList.add('dislike-btn');
        dislikeButton.addEventListener('click', () => {
            if (!votes[comment.id]) {
                comment.dislikes++;
                votes[comment.id] = 'disliked';
                saveVotes();
                renderComments();
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
                        replies: []
                    };
                    comment.replies.push(reply);
                    saveComments();
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

    // Function to render comments from Firebase
    function renderComments() {
        commentSection.innerHTML = ''; // Clear the comments section first

        db.collection('comments')
            .orderBy('timestamp', 'desc')
            .onSnapshot((snapshot) => {
                snapshot.forEach((doc) => {
                    const data = doc.data();
                    const commentElement = createCommentElement(data);
                    commentSection.appendChild(commentElement);
                });
            });
    }

    // Submit new comment to Firebase
    commentForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const text = commentInput.value.trim();
        if (text !== '') {
            await db.collection('comments').add({
                username: currentUser.username,
                avatar: currentUser.avatar,
                text: text,
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                likes: 0,
                dislikes: 0,
                replies: []
            });

            commentInput.value = ''; // Clear the input after posting
        }
    });

    // Clear all comments from Firebase
    clearButton.addEventListener('click', async () => {
        if (confirm('Are you sure you want to delete all comments?')) {
            const commentsSnapshot = await db.collection('comments').get();
            commentsSnapshot.forEach(async (doc) => {
                await db.collection('comments').doc(doc.id).delete();
            });
            renderComments(); // Reload comments after deletion
        }
    });

    // Show vote message if already voted
    function showVoteMessage(commentDiv, message) {
        let existingMsg = commentDiv.querySelector('.vote-message');
        if (existingMsg) return; // if message already exists, don't add another

        const msg = document.createElement('div');
        msg.classList.add('vote-message');
        msg.textContent = message;
        commentDiv.appendChild(msg);

        setTimeout(() => {
            msg.remove();
        }, 2000); // Message disappears after 2 seconds
    }

    // Initial render of comments
    renderComments();
});

// Firebase configuration (ensure these values are correct)
const firebaseConfig = {
    apiKey: "AIzaSyA-BlB4rTOEMiCRi8ngVnnLVVellWTV69s",
    authDomain: "mycommentsapp-a08cf.firebaseapp.com",
    projectId: "mycommentsapp-a08cf",
    storageBucket: "mycommentsapp-a08cf.appspot.com",
    messagingSenderId: "1:675866901297:web:9b8c64f9dbfcf90ce34e10",
    appId: "APP_ID"
};
