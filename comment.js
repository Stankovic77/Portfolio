document.addEventListener('DOMContentLoaded', () => {
     const commentForm = document.getElementById('comment-form');
    const commentInput = document.getElementById('comment-input');
    const commentSection = document.getElementById('comment-section');
    const clearButton = document.getElementById('clear-comments');

    let comments = JSON.parse(localStorage.getItem('comments')) || [];
    let currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;
    let usernameCounter = parseInt(localStorage.getItem('usernameCounter')) || 100;
    let votes = JSON.parse(localStorage.getItem('votes')) || {};

    function getRandomAvatar() {
        const randomText = Math.random().toString(36).substring(7);
        return `https://robohash.org/${randomText}?set=set1&size=50x50`;
    }

    if (!currentUser) {
        currentUser = {
            username: `Anonymous${usernameCounter++}`,
            avatar: getRandomAvatar()
        };
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        localStorage.setItem('usernameCounter', usernameCounter);
    }

    function saveComments() {
        localStorage.setItem('comments', JSON.stringify(comments));
    }

    function saveVotes() {
        localStorage.setItem('votes', JSON.stringify(votes));
    }

    

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
        timestampSpan.textContent = comment.timestamp;

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
                saveComments();
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
                saveComments();
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

    function renderComments() {
        commentSection.innerHTML = '';
        const sortedComments = comments.sort((a, b) => b.id - a.id);
        sortedComments.forEach(comment => {
            commentSection.appendChild(createCommentElement(comment));
        });
    }

    commentForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = commentInput.value.trim();
        if (text !== '') {
            const newComment = {
                id: Date.now(),
                username: currentUser.username,
                avatar: currentUser.avatar,
                text: text,
                timestamp: new Date().toLocaleString(),
                likes: 0,
                dislikes: 0,
                replies: []
            };
            comments.push(newComment);
            saveComments();
            renderComments();
            commentInput.value = '';
        }
    });

    clearButton.addEventListener('click', () => {
        if (confirm('Are you sure you want to delete all comments?')) {
            comments = [];
            votes = {};
            saveComments();
            saveVotes();
            renderComments();
        }
    });

    renderComments();
});

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
firebase.initializeApp(firebaseConfig);

// Connect to Firestore
const db = firebase.firestore();

document.getElementById('commentForm').addEventListener('submit', async function(e) {
    e.preventDefault();
  
    const username = document.getElementById('username').value;
    const commentText = document.getElementById('commentText').value;
  
    await db.collection('comments').add({
      username: username,
      text: commentText,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
  
    document.getElementById('commentForm').reset();
    loadComments();
  });
  
  // Load and display comments
  async function loadComments() {
    const commentsDiv = document.getElementById('comments');
    commentsDiv.innerHTML = '';
  
    const querySnapshot = await db.collection('comments').orderBy('timestamp', 'desc').get();
  
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const comment = document.createElement('div');
      comment.innerHTML = `<strong>${data.username}</strong>: ${data.text}`;
      commentsDiv.appendChild(comment);
    });
  }
  
  // Load comments on page load
  loadComments();