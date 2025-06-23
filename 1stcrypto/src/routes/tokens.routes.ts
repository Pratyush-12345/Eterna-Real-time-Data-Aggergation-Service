import { Router } from 'express';
import { TokensController } from '../controllers/tokens.controller';
import { apiLimiter, searchLimiter } from '../middleware/rateLimiter';

const router = Router();
const tokensController = new TokensController();

// Get all tokens
router.get('/', apiLimiter, tokensController.getTokens.bind(tokensController));

// Get filtered tokens
router.get('/filter', apiLimiter, tokensController.getFilteredTokens.bind(tokensController));

// Search tokens
router.get('/search', searchLimiter, tokensController.searchTokens.bind(tokensController));

// Admin: Invalidate cache
router.post('/cache/invalidate', tokensController.invalidateCache.bind(tokensController));

export default router;