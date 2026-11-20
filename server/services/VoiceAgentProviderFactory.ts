import { VoiceAgentProvider, VoiceAgentProviderFactory } from '../interfaces/VoiceAgentProvider';
import { RetellProvider } from './RetellProvider';

export class DefaultVoiceAgentProviderFactory implements VoiceAgentProviderFactory {
  createProvider(providerType: 'retell'): VoiceAgentProvider {
    if (providerType === 'retell') {
      return new RetellProvider();
    }
    throw new Error(`Unsupported voice agent provider: ${providerType}`);
  }
}

/**
 * Get the active voice agent provider based on environment configuration
 */
export function getActiveVoiceProvider(): VoiceAgentProvider {
  const factory = new DefaultVoiceAgentProviderFactory();
  const providerType = 'retell'; // Only Retell supported now
  
  console.log(`🎯 Using voice agent provider: ${providerType.toUpperCase()}`);
  
  return factory.createProvider(providerType);
}

/**
 * Get a specific voice agent provider
 */
export function getVoiceProvider(providerType: 'retell'): VoiceAgentProvider {
  const factory = new DefaultVoiceAgentProviderFactory();
  return factory.createProvider(providerType);
}