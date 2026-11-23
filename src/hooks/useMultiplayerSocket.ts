import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  PlayerReaction,
  PublicRoomSummary,
  RoomState,
  RoomVisibility,
} from '../types/game';

export type SocketStatus = 'connecting' | 'connected' | 'reconnecting';

export function useMultiplayerSocket() {
  const [status, setStatus] = useState<SocketStatus>('connecting');
  const [publicRooms, setPublicRooms] = useState<PublicRoomSummary[]>([]);
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [myParticipantId, setMyParticipantId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [reactions, setReactions] = useState<PlayerReaction[]>([]);

  const wsRef = useRef<WebSocket | null>(null);
  const seatTokenRef = useRef<string | null>(null);
  const roomCodeRef = useRef<string | null>(null);
  const lastSeqRef = useRef<number>(0);
  const reconnectTimerRef = useRef<number | null>(null);
  const unmountedRef = useRef(false);

  const send = useCallback((payload: Record<string, unknown>) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return false;
    ws.send(
      JSON.stringify({
        ...payload,
        seatToken: seatTokenRef.current ?? undefined,
      })
    );
    return true;
  }, []);

  const connect = useCallback(() => {
    if (unmountedRef.current) return;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setStatus('connected');
      setErrorMsg(null);
      if (roomCodeRef.current && seatTokenRef.current) {
        ws.send(
          JSON.stringify({
            type: 'room:reconnect',
            code: roomCodeRef.current,
            seatToken: seatTokenRef.current,
          })
        );
      } else {
        ws.send(JSON.stringify({ type: 'room:list_public' }));
      }
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'room:public_list') {
          setPublicRooms(data.rooms ?? []);
          return;
        }
        if (data.type === 'room:joined') {
          seatTokenRef.current = data.seatToken ?? null;
          roomCodeRef.current = data.state?.code ?? null;
          lastSeqRef.current = data.state?.sequenceId ?? 0;
          setMyParticipantId(data.participantId ?? null);
          setRoomState(data.state ?? null);
          setErrorMsg(null);
          if (data.state?.code && data.seatToken) {
            void fetch('/api/seat-session', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({
                code: data.state.code,
                seatToken: data.seatToken,
              }),
            }).catch(() => {});
          }
          return;
        }
        if (data.type === 'game:state_update' && data.state) {
          const incomingSeq = Number(data.state.sequenceId ?? 0);
          if (incomingSeq >= lastSeqRef.current) {
            lastSeqRef.current = incomingSeq;
            setRoomState(data.state);
          }
          return;
        }
        if (data.type === 'room:left') {
          seatTokenRef.current = null;
          roomCodeRef.current = null;
          lastSeqRef.current = 0;
          setMyParticipantId(null);
          setRoomState(null);
          void fetch('/api/seat-session', {
            method: 'DELETE',
            credentials: 'include',
          }).catch(() => {});
          return;
        }
        if (data.type === 'game:reaction' && data.reaction) {
          const rx: PlayerReaction = data.reaction;
          setReactions((prev) => [...prev.slice(-10), rx]);
          window.setTimeout(() => {
            setReactions((prev) => prev.filter((item) => item.id !== rx.id));
          }, 2600);
          return;
        }
        if (data.type === 'room:error' && typeof data.message === 'string') {
          setErrorMsg(data.message);
          window.setTimeout(() => {
            setErrorMsg((cur) => (cur === data.message ? null : cur));
          }, 4000);
        }
      } catch {
        // Ignore malformed packets
      }
    };

    ws.onclose = () => {
      if (unmountedRef.current) return;
      setStatus('reconnecting');
      reconnectTimerRef.current = window.setTimeout(() => {
        connect();
      }, 1500);
    };
  }, []);

  useEffect(() => {
    unmountedRef.current = false;
    connect();
    return () => {
      unmountedRef.current = true;
      if (reconnectTimerRef.current !== null) {
        window.clearTimeout(reconnectTimerRef.current);
      }
      wsRef.current?.close();
    };
  }, [connect]);

  return {
    status,
    publicRooms,
    roomState,
    myParticipantId,
    errorMsg,
    reactions,
    clearError: () => setErrorMsg(null),
    createRoom: (payload: {
      name: string;
      clubName: string;
      paletteId: string;
      visibility: RoomVisibility;
    }) => send({ type: 'room:create', ...payload }),
    joinRoom: (payload: {
      code: string;
      name: string;
      clubName: string;
      paletteId: string;
    }) => send({ type: 'room:join', ...payload }),
    quickMatch: (payload: {
      name: string;
      clubName: string;
      paletteId: string;
    }) => send({ type: 'room:quick_match', ...payload }),
    leaveRoom: () => {
      send({ type: 'room:leave' });
      seatTokenRef.current = null;
      roomCodeRef.current = null;
      lastSeqRef.current = 0;
      setMyParticipantId(null);
      setRoomState(null);
      void fetch('/api/seat-session', {
        method: 'DELETE',
        credentials: 'include',
      }).catch(() => {});
    },
    refreshPublicRooms: () => send({ type: 'room:list_public' }),
    updateProfile: (payload: { name: string; clubName: string; paletteId: string }) =>
      send({ type: 'lobby:update_profile', ...payload }),
    toggleReady: () => send({ type: 'lobby:toggle_ready' }),
    toggleFillBots: () => send({ type: 'lobby:toggle_fill_bots' }),
    startMatch: () => send({ type: 'lobby:start_match' }),
    rollDice: () => send({ type: 'turn:roll_dice' }),
    signPlayer: (footballerId: string) =>
      send({ type: 'turn:sign_player', footballerId }),
    passSigning: () => send({ type: 'turn:pass_signing' }),
    sellPlayer: (squadIndex: number) =>
      send({ type: 'turn:sell_player', squadIndex }),
    placeBid: () => send({ type: 'auction:place_bid' }),
    passAuction: () => send({ type: 'auction:pass' }),
    submitChallengeAnswer: (optionIndex: number) =>
      send({ type: 'challenge:submit_answer', optionIndex }),
    sendPenaltyShot: (aim: 'LEFT' | 'CENTER' | 'RIGHT', power: number) =>
      send({ type: 'challenge:penalty_shot', aim, power }),
    sendCrossbarKick: (level: number) =>
      send({ type: 'challenge:crossbar_kick', level }),
    submitDuelAnswer: (optionIndex: number) =>
      send({ type: 'duel:submit_answer', optionIndex }),
    applyLuck: () => send({ type: 'luck:apply' }),
    resolveJail: (action: 'BAIL' | 'CHALLENGE' | 'WAIT') =>
      send({ type: 'jail:resolve', action }),
    sendReaction: (reactionKey: string) =>
      send({ type: 'reaction:send', reactionKey }),
    requestRematch: () => send({ type: 'room:rematch' }),
    returnToLobby: () => send({ type: 'room:return_to_lobby' }),
  };
}
