// Sport Data API Example
import express from 'express';

const router = express.Router();
router.get('/detailed', async (req, res) => {
const response = await fetch('https://sportdataapi.com', {
    method: 'GET',
    headers: {
        'Content-Type': 'application/json'
    }
});

const data = await response.json();
console.log(data);
    res.status(200).json(data);
});

export default router;