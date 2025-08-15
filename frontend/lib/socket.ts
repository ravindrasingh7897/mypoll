import { io, Socket } from 'socket.io-client';

class SocketService {
  private socket: Socket | null = null;
  private static instance: SocketService;

  private constructor() {}

  public static getInstance(): SocketService {
    if (!SocketService.instance) {
      SocketService.instance = new SocketService();
    }
    return SocketService.instance;
  }

  public connect(url: string = process.env.NEXT_PUBLIC_SOCKET_URL || 'https://mypoll-w391.onrender.com'): Socket {
    if (this.socket?.connected) {
      return this.socket;
    }

    this.socket = io(url, {
      transports: ['websocket'],
      autoConnect: true,
    });

    this.socket.on('connect', () => {
      console.log('Connected to server:', this.socket?.id);
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from server');
    });

    this.socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
    });

    return this.socket;
  }

  public disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  public getSocket(): Socket | null {
    return this.socket;
  }

  public joinPoll(pollId: string): void {
    if (this.socket) {
      this.socket.emit('join-poll', pollId);
    }
  }

  public leavePoll(pollId: string): void {
    if (this.socket) {
      this.socket.emit('leave-poll', pollId);
    }
  }

  public onNewPoll(callback: (pollData: any) => void): void {
    if (this.socket) {
      this.socket.on('new-poll', callback);
    }
  }

  public onPollResultsUpdated(callback: (results: any) => void): void {
    if (this.socket) {
      this.socket.on('poll-results-updated', callback);
    }
  }

  public onPollEnded(callback: (data: any) => void): void {
    if (this.socket) {
      this.socket.on('poll-ended', callback);
    }
  }

  public offNewPoll(): void {
    if (this.socket) {
      this.socket.off('new-poll');
    }
  }

  public offPollResultsUpdated(): void {
    if (this.socket) {
      this.socket.off('poll-results-updated');
    }
  }

  public offPollEnded(): void {
    if (this.socket) {
      this.socket.off('poll-ended');
    }
  }
}

export default SocketService;
