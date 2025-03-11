/**
 * YAML generator for Spheron Protocol deployments
 */

import { generateYaml, validateYaml, updateYaml } from './generator.js';
import { ExtractedParams } from '../natural-language-processor/index.js';

/**
 * Generate YAML configuration from extracted parameters
 * @param params Extracted parameters
 * @returns YAML configuration
 */
export function generateYamlFromParams(params: ExtractedParams): string {
  return generateYaml(params);
}

/**
 * Validate YAML configuration
 * @param yamlConfig YAML configuration
 * @returns Validation result
 */
export function validateYamlConfig(yamlConfig: string): { valid: boolean; errors: string[] } {
  return validateYaml(yamlConfig);
}

/**
 * Update existing YAML configuration with new parameters
 * @param existingYaml Existing YAML configuration
 * @param params New parameters
 * @returns Updated YAML configuration
 */
export function updateYamlConfig(existingYaml: string, params: ExtractedParams): string {
  return updateYaml(existingYaml, params);
}
