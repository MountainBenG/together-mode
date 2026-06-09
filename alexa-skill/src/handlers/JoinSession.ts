import { HandlerInput, RequestHandler } from 'ask-sdk-core';
import { getSessionByPin, joinSessionAsPlayer2, linkDevice } from '../supabase';
import { v4 as uuidv4 } from 'uuid';

export const JoinSessionHandler: RequestHandler = {
  canHandle(input: HandlerInput) {
    const req = input.requestEnvelope.request;
    return (
      req.type === 'IntentRequest' &&
      req.intent.name === 'JoinSessionIntent'
    );
  },
  async handle(input: HandlerInput) {
    const req = input.requestEnvelope.request as any;
    const pinStr = req.intent?.slots?.SessionPin?.value;
    const pin = parseInt(pinStr, 10);

    if (!pinStr || isNaN(pin) || pin < 1000 || pin > 9999) {
      return input.responseBuilder
        .speak("I didn't catch the PIN. Say join session followed by a 4-digit number, like join session 4 8 2 1.")
        .reprompt("What's your 4-digit session PIN?")
        .getResponse();
    }

    const session = await getSessionByPin(pin);
    if (!session) {
      return input.responseBuilder
        .speak(`I couldn't find an active session with PIN ${pin}. Make sure the Together Mode app is open and showing a session code.`)
        .reprompt("Try again with your 4-digit PIN.")
        .getResponse();
    }

    const deviceId = input.requestEnvelope.context.System.device.deviceId;
    const playerId = `alexa-${uuidv4().substring(0, 8)}`;

    // If waiting, join as player 2. If already voting, reconnect as player 2.
    let isPlayer1 = false;
    if (session.status === 'waiting') {
      const result = await joinSessionAsPlayer2(session.code, playerId);
      if (!result.ok) {
        return input.responseBuilder
          .speak("Something went wrong joining the session. Please try again.")
          .getResponse();
      }
    } else {
      // Session already has both players — reconnect this device as player 2
      isPlayer1 = false;
    }

    await linkDevice(deviceId, session.code, playerId, isPlayer1);

    return input.responseBuilder
      .speak(`Connected to session ${session.code}. You're ready to vote. Say vote yes or vote no for each movie.`)
      .reprompt('Say vote yes or vote no.')
      .getResponse();
  },
};
