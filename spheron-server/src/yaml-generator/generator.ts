/**
 * YAML generator for Spheron Protocol deployments
 */

import * as yaml from 'js-yaml';
import { ExtractedParams } from '../natural-language-processor/index.js';

/**
 * Generate YAML configuration from extracted parameters
 * @param params Extracted parameters
 * @returns YAML configuration
 */
export function generateYaml(params: ExtractedParams): string {
  // Create the YAML structure
  const yamlConfig = {
    version: '1.0',
    services: {
      [params.name || 'py-cuda']: {
        image: params.image || 'spheronnetwork/jupyter-notebook:pytorch-2.4.1-cuda-enabled',
        pull_policy: params.pullPolicy || 'IfNotPresent',
        expose: generateExposeConfig(params),
        env: generateEnvConfig(params)
      }
    },
    profiles: {
      name: params.name || 'py-cuda',
      duration: params.duration || '2h',
      mode: params.mode || 'provider',
      compute: {
        [params.name || 'py-cuda']: {
          resources: generateResourcesConfig(params)
        }
      },
      placement: {
        [params.region || 'westcoast']: {
          pricing: {
            [params.name || 'py-cuda']: {
              token: 'CST', // Always CST
              amount: params.amount || 15
            }
          }
        }
      }
    },
    deployment: {
      [params.name || 'py-cuda']: {
        [params.region || 'westcoast']: {
          profile: params.name || 'py-cuda',
          count: params.count || 1
        }
      }
    }
  };
  
  // Convert to YAML
  return yaml.dump(yamlConfig, {
    indent: 2,
    lineWidth: -1, // No line wrapping
    noRefs: true
  });
}

/**
 * Generate expose configuration
 * @param params Extracted parameters
 * @returns Expose configuration
 */
function generateExposeConfig(params: ExtractedParams): any[] {
  if (params.ports && params.ports.length > 0) {
    return params.ports.map(port => ({
      port: port.port,
      as: port.as || port.port,
      to: [
        {
          global: port.global !== undefined ? port.global : true
        }
      ]
    }));
  }
  
  // Default ports for Jupyter notebook
  return [
    {
      port: 8888,
      as: 8888,
      to: [
        {
          global: true
        }
      ]
    },
    {
      port: 3000,
      as: 3000,
      to: [
        {
          global: true
        }
      ]
    }
  ];
}

/**
 * Generate environment variables configuration
 * @param params Extracted parameters
 * @returns Environment variables configuration
 */
function generateEnvConfig(params: ExtractedParams): string[] {
  if (params.env) {
    return Object.entries(params.env).map(([key, value]) => `${key}=${value}`);
  }
  
  // Default environment variables for Jupyter notebook
  return ['JUPYTER_TOKEN=test'];
}

/**
 * Generate resources configuration
 * @param params Extracted parameters
 * @returns Resources configuration
 */
function generateResourcesConfig(params: ExtractedParams): any {
  const resources: any = {
    cpu: {
      units: params.cpu || 16
    },
    memory: {
      size: params.memory || '64Gi'
    }
  };
  
  // Add storage
  if (params.storage) {
    resources.storage = [
      {
        size: params.storage
      }
    ];
  } else {
    resources.storage = [
      {
        size: '500Gi'
      }
    ];
  }
  
  // Add GPU if specified
  if (params.gpu) {
    resources.gpu = {
      units: params.gpu.units || 1,
      attributes: {
        vendor: {
          nvidia: [
            {
              model: params.gpu.model || 'rtx6000-ada'
            }
          ]
        }
      }
    };
  }
  
  return resources;
}

/**
 * Validate YAML configuration
 * @param yamlConfig YAML configuration
 * @returns Validation result
 */
export function validateYaml(yamlConfig: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  try {
    // Parse YAML
    const config = yaml.load(yamlConfig) as any;
    
    // Check version
    if (config.version !== '1.0') {
      errors.push('Version must be "1.0"');
    }
    
    // Check services
    if (!config.services || Object.keys(config.services).length === 0) {
      errors.push('At least one service must be defined');
    }
    
    // Check profiles
    if (!config.profiles) {
      errors.push('Profiles must be defined');
    } else {
      // Check duration
      if (!config.profiles.duration) {
        errors.push('Duration must be specified');
      }
      
      // Check mode
      if (!config.profiles.mode) {
        errors.push('Mode must be specified');
      }
      
      // Check compute
      if (!config.profiles.compute || Object.keys(config.profiles.compute).length === 0) {
        errors.push('Compute resources must be defined');
      }
      
      // Check placement
      if (!config.profiles.placement || Object.keys(config.profiles.placement).length === 0) {
        errors.push('Placement must be defined');
      } else {
        // Check pricing
        for (const region of Object.keys(config.profiles.placement)) {
          const placement = config.profiles.placement[region];
          if (!placement.pricing || Object.keys(placement.pricing).length === 0) {
            errors.push(`Pricing must be defined for region "${region}"`);
          } else {
            // Check token
            for (const profile of Object.keys(placement.pricing)) {
              const pricing = placement.pricing[profile];
              if (pricing.token !== 'CST') {
                errors.push(`Token must be "CST" for profile "${profile}" in region "${region}"`);
              }
            }
          }
        }
      }
    }
    
    // Check deployment
    if (!config.deployment || Object.keys(config.deployment).length === 0) {
      errors.push('Deployment must be defined');
    }
  } catch (error) {
    errors.push(`Invalid YAML: ${error instanceof Error ? error.message : String(error)}`);
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Update existing YAML configuration with new parameters
 * @param existingYaml Existing YAML configuration
 * @param params New parameters
 * @returns Updated YAML configuration
 */
export function updateYaml(existingYaml: string, params: ExtractedParams): string {
  try {
    // Parse existing YAML
    const config = yaml.load(existingYaml) as any;
    
    // Update services
    if (config.services) {
      const serviceName = Object.keys(config.services)[0];
      const service = config.services[serviceName];
      
      if (params.image) {
        service.image = params.image;
      }
      
      if (params.pullPolicy) {
        service.pull_policy = params.pullPolicy;
      }
      
      if (params.ports) {
        service.expose = generateExposeConfig(params);
      }
      
      if (params.env) {
        service.env = generateEnvConfig(params);
      }
    }
    
    // Update profiles
    if (config.profiles) {
      if (params.name) {
        config.profiles.name = params.name;
      }
      
      if (params.duration) {
        config.profiles.duration = params.duration;
      }
      
      if (params.mode) {
        config.profiles.mode = params.mode;
      }
      
      // Update compute resources
      if (config.profiles.compute) {
        const computeName = Object.keys(config.profiles.compute)[0];
        const compute = config.profiles.compute[computeName];
        
        if (compute.resources) {
          if (params.cpu) {
            compute.resources.cpu = { units: params.cpu };
          }
          
          if (params.memory) {
            compute.resources.memory = { size: params.memory };
          }
          
          if (params.storage) {
            compute.resources.storage = [{ size: params.storage }];
          }
          
          if (params.gpu) {
            compute.resources.gpu = {
              units: params.gpu.units || 1,
              attributes: {
                vendor: {
                  nvidia: [
                    {
                      model: params.gpu.model || 'rtx6000-ada'
                    }
                  ]
                }
              }
            };
          }
        }
      }
      
      // Update placement
      if (config.profiles.placement) {
        const regionName = Object.keys(config.profiles.placement)[0];
        const placement = config.profiles.placement[regionName];
        
        if (placement.pricing) {
          const pricingName = Object.keys(placement.pricing)[0];
          const pricing = placement.pricing[pricingName];
          
          // Always set token to CST
          pricing.token = 'CST';
          
          if (params.amount) {
            pricing.amount = params.amount;
          }
        }
      }
    }
    
    // Update deployment
    if (config.deployment) {
      const deploymentName = Object.keys(config.deployment)[0];
      const deployment = config.deployment[deploymentName];
      
      const regionName = Object.keys(deployment)[0];
      const region = deployment[regionName];
      
      if (params.name) {
        region.profile = params.name;
      }
      
      if (params.count) {
        region.count = params.count;
      }
    }
    
    // Convert back to YAML
    return yaml.dump(config, {
      indent: 2,
      lineWidth: -1,
      noRefs: true
    });
  } catch (error) {
    console.error('[Error] Failed to update YAML:', error);
    // If updating fails, generate a new YAML
    return generateYaml(params);
  }
}
