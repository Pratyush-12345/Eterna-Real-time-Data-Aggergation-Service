import { WebSocketService } from '../services/websocket.service';
import { createServer } from 'http';
import express from 'express';

describe('WebSocketService', () => {
  let server: any;

  beforeAll(() => {
    const app = express();
    server = createServer(app);
  });

  it('should start WebSocketService without error', () => {
    const service = new WebSocketService(server);
    expect(() => service.startRealTimeUpdates()).not.toThrow();
  });
});
