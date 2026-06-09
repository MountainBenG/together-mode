import { HandlerInput, RequestHandler } from 'ask-sdk-core';
import { getLinkedSession, submitVote } from '../supabase';

function makeVoteHandler(vote: 'yes' | 'no', intentName: string): RequestHandler {
  return {
    canHandle(input: HandlerInput) {
      const req = input.requestEnvelope.request;
      return req.type === 'IntentRequest' && req.intent.name === intentName;
    },
    async handle(input: HandlerInput) {
      const deviceId = input.requestEnvelope.context.System.device.deviceId;
      const linked = await getLinkedSession(deviceId);

      if (!linked) {
        return input.responseBuilder
          .speak("You're not connected to a session yet. Say join session and your 4-digit PIN to connect.")
          .reprompt("Say join session and your PIN.")
          .getResponse();
      }

      const ok = await submitVote(linked.session_code, linked.is_player1, vote);

      if (!ok) {
        return input.responseBuilder
          .speak("Something went wrong submitting your vote. Try again.")
          .getResponse();
      }

      const phrase = vote === 'yes'
        ? ['Nice!', 'Got it!', 'Yes noted.', 'Voting yes.'][Math.floor(Math.random() * 4)]
        : ['Nope!', 'Got it.', 'Skipping.', 'Voting no.'][Math.floor(Math.random() * 4)];

      return input.responseBuilder
        .speak(phrase)
        .getResponse();
    },
  };
}

export const VoteYesHandler = makeVoteHandler('yes', 'VoteYesIntent');
export const VoteNoHandler  = makeVoteHandler('no',  'VoteNoIntent');
