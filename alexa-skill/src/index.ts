import { SkillBuilders } from 'ask-sdk-core';
import { LaunchRequestHandler } from './handlers/LaunchRequest';
import { JoinSessionHandler } from './handlers/JoinSession';
import { VoteYesHandler, VoteNoHandler } from './handlers/Vote';

// Standard Alexa built-in handlers
const HelpHandler = {
  canHandle: (i: any) => i.requestEnvelope.request.type === 'IntentRequest' && i.requestEnvelope.request.intent.name === 'AMAZON.HelpIntent',
  handle: (i: any) => i.responseBuilder.speak('Say vote yes or vote no to pick a movie. If you need to connect first, say join session and your 4-digit PIN.').reprompt('Say vote yes or vote no.').getResponse(),
};

const CancelStopHandler = {
  canHandle: (i: any) => i.requestEnvelope.request.type === 'IntentRequest' && ['AMAZON.CancelIntent', 'AMAZON.StopIntent'].includes(i.requestEnvelope.request.intent.name),
  handle: (i: any) => i.responseBuilder.speak('Goodbye!').getResponse(),
};

const SessionEndedHandler = {
  canHandle: (i: any) => i.requestEnvelope.request.type === 'SessionEndedRequest',
  handle: (i: any) => i.responseBuilder.getResponse(),
};

const ErrorHandler = {
  canHandle: () => true,
  handle: (i: any, error: Error) => {
    console.error('Alexa skill error:', error);
    return i.responseBuilder.speak("Sorry, something went wrong. Please try again.").getResponse();
  },
};

export const handler = SkillBuilders.custom()
  .addRequestHandlers(
    LaunchRequestHandler,
    JoinSessionHandler,
    VoteYesHandler,
    VoteNoHandler,
    HelpHandler,
    CancelStopHandler,
    SessionEndedHandler,
  )
  .addErrorHandlers(ErrorHandler)
  .lambda();
