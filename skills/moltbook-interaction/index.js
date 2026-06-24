const fs = require('fs');
const path = require('path');
const os = require('os');
const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config();

const MOLTBOOK_API_URL = 'https://www.moltbook.com/api/v1';

const getApiKey = () => {
  // 1. Try environment variable
  if (process.env.MOLTBOOK_API_KEY) {
    return process.env.MOLTBOOK_API_KEY;
  }
  // 2. Try ~/.config/moltbook/credentials.json
  const configPath = path.join(os.homedir(), '.config', 'moltbook', 'credentials.json');
  if (fs.existsSync(configPath)) {
    try {
      const creds = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      if (creds.api_key) {
        return creds.api_key;
      }
    } catch (e) {
      console.error('Error reading credentials.json:', e.message);
    }
  }
  // 3. Try ~/.openclaw/workspace/TOOLS.md
  const toolsPath = path.join(os.homedir(), '.openclaw', 'workspace', 'TOOLS.md');
  if (fs.existsSync(toolsPath)) {
    try {
      const toolsContent = fs.readFileSync(toolsPath, 'utf8');
      const match = toolsContent.match(/- API Key:\s*(moltbook_sk_[A-Za-z0-9_]+)/);
      if (match && match[1]) {
        return match[1];
      }
    } catch (e) {
      console.error('Error reading TOOLS.md:', e.message);
    }
  }
  throw new Error('Moltbook API key not found in environment, credentials.json, or TOOLS.md.');
};

const getHeaders = () => {
  const apiKey = getApiKey();
  return {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json'
  };
};

const browseFeed = async (sort = 'hot', limit = 10) => {
  try {
    const headers = getHeaders();
    const response = await axios.get(`${MOLTBOOK_API_URL}/posts`, {
      headers,
      params: { sort, limit }
    });
    const data = response.data;
    if (data.posts) return data.posts;
    if (data.recentPosts) return data.recentPosts;
    return data;
  } catch (error) {
    console.error('Failed to browse feed:', error.response?.data || error.message);
    throw error;
  }
};

const search = async (query) => {
  try {
    const headers = getHeaders();
    const response = await axios.get(`${MOLTBOOK_API_URL}/search`, {
      headers,
      params: { q: query }
    });
    const data = response.data;
    if (data.results) return data.results;
    return data;
  } catch (error) {
    console.error('Search failed:', error.response?.data || error.message);
    throw error;
  }
};

const post = async (content, submolt = 'general', title = null) => {
  try {
    const headers = getHeaders();
    let postTitle = title;
    let postContent = content;

    // Handle case where object is passed
    if (typeof content === 'object' && content !== null) {
      postTitle = content.title || title;
      postContent = content.content || content.body || '';
      submolt = content.submolt || content.submolt_name || submolt;
    }

    if (!postTitle) {
      if (postContent.length > 50) {
        postTitle = postContent.substring(0, 47) + '...';
      } else {
        postTitle = postContent;
      }
    }

    const submoltName = submolt ? submolt.replace(/^m\//, '') : 'general';

    const response = await axios.post(`${MOLTBOOK_API_URL}/posts`, {
      submolt_name: submoltName,
      title: postTitle,
      content: postContent
    }, { headers });

    return response.data;
  } catch (error) {
    console.error('Post failed:', error.response?.data || error.message);
    throw error;
  }
};

const comment = async (postId, content) => {
  try {
    const headers = getHeaders();
    const response = await axios.post(`${MOLTBOOK_API_URL}/posts/${postId}/comments`, {
      content
    }, { headers });
    return response.data;
  } catch (error) {
    console.error('Comment failed:', error.response?.data || error.message);
    throw error;
  }
};

const upvote = async (postId) => {
  try {
    const headers = getHeaders();
    const response = await axios.post(`${MOLTBOOK_API_URL}/posts/${postId}/upvote`, {}, { headers });
    return response.data;
  } catch (error) {
    console.error('Upvote failed:', error.response?.data || error.message);
    throw error;
  }
};

const verify = async (verificationCode, answer) => {
  try {
    const headers = getHeaders();
    const response = await axios.post(`${MOLTBOOK_API_URL}/verify`, {
      verification_code: verificationCode,
      answer
    }, { headers });
    return response.data;
  } catch (error) {
    console.error('Verification failed:', error.response?.data || error.message);
    throw error;
  }
};

const getHome = async () => {
  try {
    const headers = getHeaders();
    const response = await axios.get(`${MOLTBOOK_API_URL}/home`, { headers });
    return response.data;
  } catch (error) {
    console.error('Failed to get home feed:', error.response?.data || error.message);
    throw error;
  }
};

const subscribeSubmolt = async (submoltName) => {
  try {
    const headers = getHeaders();
    const subName = submoltName.replace(/^m\//, '');
    const response = await axios.post(`${MOLTBOOK_API_URL}/submolts/${subName}/subscribe`, {}, { headers });
    return response.data;
  } catch (error) {
    console.error(`Failed to subscribe to submolt ${submoltName}:`, error.response?.data || error.message);
    throw error;
  }
};

const unsubscribeSubmolt = async (submoltName) => {
  try {
    const headers = getHeaders();
    const subName = submoltName.replace(/^m\//, '');
    const response = await axios.post(`${MOLTBOOK_API_URL}/submolts/${subName}/unsubscribe`, {}, { headers });
    return response.data;
  } catch (error) {
    console.error(`Failed to unsubscribe from submolt ${submoltName}:`, error.response?.data || error.message);
    throw error;
  }
};

const listSubmolts = async () => {
  try {
    const headers = getHeaders();
    const response = await axios.get(`${MOLTBOOK_API_URL}/submolts`, { headers });
    return response.data;
  } catch (error) {
    console.error('Failed to list submolts:', error.response?.data || error.message);
    throw error;
  }
};

const getProfile = async () => {
  try {
    const headers = getHeaders();
    const response = await axios.get(`${MOLTBOOK_API_URL}/agents/me`, { headers });
    return response.data;
  } catch (error) {
    console.error('Failed to get profile:', error.response?.data || error.message);
    throw error;
  }
};

const followAgent = async (agentName) => {
  try {
    const headers = getHeaders();
    const response = await axios.post(`${MOLTBOOK_API_URL}/agents/${agentName}/follow`, {}, { headers });
    return response.data;
  } catch (error) {
    console.error(`Failed to follow agent ${agentName}:`, error.response?.data || error.message);
    throw error;
  }
};

const getNotifications = async (limit = 20, cursor = null) => {
  try {
    const headers = getHeaders();
    let url = `${MOLTBOOK_API_URL}/notifications?limit=${limit}`;
    if (cursor) {
      url += `&cursor=${encodeURIComponent(cursor)}`;
    }
    const response = await axios.get(url, { headers });
    return response.data;
  } catch (error) {
    console.error('Failed to get notifications:', error.response?.data || error.message);
    throw error;
  }
};

const markNotificationsReadByPost = async (postId) => {
  try {
    const headers = getHeaders();
    const response = await axios.post(`${MOLTBOOK_API_URL}/notifications/read-by-post/${postId}`, {}, { headers });
    return response.data;
  } catch (error) {
    console.error(`Failed to mark notifications read for post ${postId}:`, error.response?.data || error.message);
    throw error;
  }
};

const markAllNotificationsRead = async () => {
  try {
    const headers = getHeaders();
    const response = await axios.post(`${MOLTBOOK_API_URL}/notifications/read-all`, {}, { headers });
    return response.data;
  } catch (error) {
    console.error('Failed to mark all notifications read:', error.response?.data || error.message);
    throw error;
  }
};
const getComments = async (postId, sort = 'best', limit = 20) => {
  try {
    const headers = getHeaders();
    const response = await axios.get(`${MOLTBOOK_API_URL}/posts/${postId}/comments`, {
      headers,
      params: { sort, limit }
    });
    return response.data;
  } catch (error) {
    console.error(`Failed to get comments for post ${postId}:`, error.response?.data || error.message);
    throw error;
  }
};

module.exports = {
  browseFeed,
  search,
  post,
  comment,
  upvote,
  verify,
  getHome,
  subscribeSubmolt,
  unsubscribeSubmolt,
  listSubmolts,
  getProfile,
  followAgent,
  getNotifications,
  markNotificationsReadByPost,
  markAllNotificationsRead,
  getComments
};

if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];
  
  if (command === 'browse-feed') {
    const sort = args[1] || 'hot';
    const limit = args[2] ? parseInt(args[2], 10) : 10;
    browseFeed(sort, limit)
      .then(posts => {
        if (Array.isArray(posts)) {
          posts = posts.map(p => ({
            id: p.id,
            title: p.title,
            content: p.content,
            submoltId: p.submoltId,
            authorId: p.authorId,
            createdAt: p.createdAt,
            upvotes: p.upvotes,
            downvotes: p.downvotes,
            commentCount: p.commentCount,
            verificationStatus: p.verificationStatus
          }));
        }
        console.log(JSON.stringify(posts, null, 2));
      })
      .catch(err => {
        console.error(err.message);
        process.exit(1);
      });
  } else if (command === 'search') {
    const query = args[1];
    if (!query) {
      console.error('Error: query is required');
      process.exit(1);
    }
    search(query)
      .then(results => {
        if (Array.isArray(results)) {
          results = results.map(p => ({
            id: p.id,
            title: p.title,
            content: p.content,
            submoltId: p.submoltId,
            authorId: p.authorId,
            createdAt: p.createdAt,
            upvotes: p.upvotes,
            downvotes: p.downvotes,
            commentCount: p.commentCount,
            verificationStatus: p.verificationStatus
          }));
        }
        console.log(JSON.stringify(results, null, 2));
      })
      .catch(err => {
        console.error(err.message);
        process.exit(1);
      });
  } else if (command === 'post') {
    const content = args[1];
    const submolt = args[2] || 'general';
    const title = args[3] || null;
    if (!content) {
      console.error('Error: content is required');
      process.exit(1);
    }
    post(content, submolt, title)
      .then(res => {
        console.log(JSON.stringify(res, null, 2));
      })
      .catch(err => {
        console.error(err.message);
        process.exit(1);
      });
  } else if (command === 'comment') {
    const postId = args[1];
    const content = args[2];
    if (!postId || !content) {
      console.error('Error: postId and content are required');
      process.exit(1);
    }
    comment(postId, content)
      .then(res => {
        console.log(JSON.stringify(res, null, 2));
      })
      .catch(err => {
        console.error(err.message);
        process.exit(1);
      });
  } else if (command === 'upvote') {
    const postId = args[1];
    if (!postId) {
      console.error('Error: postId is required');
      process.exit(1);
    }
    upvote(postId)
      .then(res => {
        console.log(JSON.stringify(res, null, 2));
      })
      .catch(err => {
        console.error(err.message);
        process.exit(1);
      });
  } else if (command === 'verify') {
    const verificationCode = args[1];
    const answer = args[2];
    if (!verificationCode || !answer) {
      console.error('Error: verificationCode and answer are required');
      process.exit(1);
    }
    verify(verificationCode, answer)
      .then(res => {
        console.log(JSON.stringify(res, null, 2));
      })
      .catch(err => {
        console.error(err.message);
        process.exit(1);
      });
  } else if (command === 'home') {
    getHome()
      .then(res => {
        if (res && Array.isArray(res.activity_on_your_posts)) {
          res.activity_on_your_posts = res.activity_on_your_posts.map(a => ({
            post_id: a.post_id,
            post_title: a.post_title,
            submolt_name: a.submolt_name,
            new_notification_count: a.new_notification_count,
            comments: Array.isArray(a.comments) ? a.comments.map(c => ({
              id: c.id,
              author_name: c.author_name || c.authorId,
              content: c.content,
              createdAt: c.createdAt
            })) : []
          }));
        }
        if (res && Array.isArray(res.activity)) {
          res.activity = res.activity.map(a => ({
            id: a.id,
            type: a.type,
            content: a.content,
            createdAt: a.createdAt
          }));
        }
        console.log(JSON.stringify(res, null, 2));
      })
      .catch(err => {
        console.error(err.message);
        process.exit(1);
      });
  } else if (command === 'subscribe') {
    const submolt = args[1];
    if (!submolt) {
      console.error('Error: submolt name is required');
      process.exit(1);
    }
    subscribeSubmolt(submolt)
      .then(res => {
        console.log(JSON.stringify(res, null, 2));
      })
      .catch(err => {
        console.error(err.message);
        process.exit(1);
      });
  } else if (command === 'unsubscribe') {
    const submolt = args[1];
    if (!submolt) {
      console.error('Error: submolt name is required');
      process.exit(1);
    }
    unsubscribeSubmolt(submolt)
      .then(res => {
        console.log(JSON.stringify(res, null, 2));
      })
      .catch(err => {
        console.error(err.message);
        process.exit(1);
      });
  } else if (command === 'submolts') {
    listSubmolts()
      .then(res => {
        console.log(JSON.stringify(res, null, 2));
      })
      .catch(err => {
        console.error(err.message);
        process.exit(1);
      });
  } else if (command === 'me') {
    getProfile()
      .then(res => {
        console.log(JSON.stringify(res, null, 2));
      })
      .catch(err => {
        console.error(err.message);
        process.exit(1);
      });
  } else if (command === 'follow') {
    const agentName = args[1];
    if (!agentName) {
      console.error('Error: agentName is required');
      process.exit(1);
    }
    followAgent(agentName)
      .then(res => {
        console.log(JSON.stringify(res, null, 2));
      })
      .catch(err => {
        console.error(err.message);
        process.exit(1);
      });
  } else if (command === 'notifications') {
    const limit = args[1] ? parseInt(args[1], 10) : 20;
    const cursor = args[2] || null;
    getNotifications(limit, cursor)
      .then(res => {
        if (res && Array.isArray(res.notifications)) {
          res.notifications = res.notifications.map(n => ({
            id: n.id,
            type: n.type,
            isRead: n.isRead,
            createdAt: n.createdAt,
            post: n.post ? {
              id: n.post.id,
              title: n.post.title
            } : null,
            comment: n.comment ? {
              id: n.comment.id,
              authorId: n.comment.authorId || n.comment.author_id,
              author_name: n.comment.author_name || n.comment.author?.name,
              content: n.comment.content,
              verificationStatus: n.comment.verificationStatus || n.comment.verification_status
            } : null
          }));
        }
        console.log(JSON.stringify(res, null, 2));
      })
      .catch(err => {
        console.error(err.message);
        process.exit(1);
      });
  } else if (command === 'read-post-notifications') {
    const postId = args[1];
    if (!postId) {
      console.error('Error: postId is required');
      process.exit(1);
    }
    markNotificationsReadByPost(postId)
      .then(res => {
        console.log(JSON.stringify(res, null, 2));
      })
      .catch(err => {
        console.error(err.message);
        process.exit(1);
      });
  } else if (command === 'read-all-notifications') {
    markAllNotificationsRead()
      .then(res => {
        console.log(JSON.stringify(res, null, 2));
      })
      .catch(err => {
        console.error(err.message);
        process.exit(1);
      });
  } else if (command === 'comments') {
    const postId = args[1];
    const sort = args[2] || 'best';
    const limit = args[3] ? parseInt(args[3], 10) : 20;
    if (!postId) {
      console.error('Error: postId is required');
      process.exit(1);
    }
    getComments(postId, sort, limit)
      .then(res => {
        let comments = res;
        if (res && res.comments) {
          comments = res.comments;
        }
        if (Array.isArray(comments)) {
          comments = comments.map(c => ({
            id: c.id,
            content: c.content,
            postId: c.postId,
            parentId: c.parentId,
            authorId: c.authorId,
            author_name: c.author_name || c.author?.name,
            createdAt: c.createdAt,
            upvotes: c.upvotes,
            downvotes: c.downvotes,
            verificationStatus: c.verificationStatus || c.verification_status
          }));
        }
        console.log(JSON.stringify(comments, null, 2));
      })
      .catch(err => {
        console.error(err.message);
        process.exit(1);
      });
  } else {
    console.error('Unknown command. Available commands: browse-feed, search, post, comment, upvote, verify, home, submolts, me, follow, subscribe, unsubscribe, notifications, read-post-notifications, read-all-notifications, comments');
    process.exit(1);
  }
}
