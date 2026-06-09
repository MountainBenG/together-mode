import { HandlerInput, RequestHandler } from 'ask-sdk-core';
import { getLinkedSession } from '../supabase';

export const LaunchRequestHandler: RequestHandler = {
  canHandle(input: HandlerInput) {
    return input.requestEnvelope.request.type === 'LaunchRequest';
  },
  async handle(input: HandlerInput) {
    const deviceId = input.requestEnvelope.context.System.device.deviceId;
    const linked = await getLinkedSession(deviceId);

    if (linked) {
      return input.responseBuilder
        .speak(`Together Mode is connected to session ${linked.session_code}. Say vote yes or vote no to pick a movie.`)
        .reprompt('Say vote yes or vote no.')
        .getResponse();
    }

    return input.responseBuilder
      .speak("Welcome to Together Mode. To get started, say: join session, then your 4-digit PIN. You can find the PIN in the Together Mode app.")
      .reprompt("Say join session and your 4-digit PIN to connect.")
      .getResponse();
  },
};
