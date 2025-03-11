/**
 * Template-based processor for extracting compute requirements from natural language
 */

// Define types for extracted parameters
export interface ExtractedParams {
  // Service parameters
  image?: string;
  pullPolicy?: 'Always' | 'IfNotPresent' | 'Never';
  ports?: Array<{
    port: number;
    as?: number;
    global?: boolean;
  }>;
  env?: Record<string, string>;
  
  // Compute resources
  cpu?: number;
  memory?: string;
  storage?: string;
  gpu?: {
    units?: number;
    model?: string;
  };
  
  // Deployment parameters
  name?: string;
  duration?: string;
  mode?: 'provider' | 'fizz';
  region?: string;
  amount?: number;
  count?: number;
}

// Default values
export const DEFAULT_PARAMS: Partial<ExtractedParams> = {
  image: 'spheronnetwork/jupyter-notebook:pytorch-2.4.1-cuda-enabled',
  pullPolicy: 'IfNotPresent',
  ports: [
    { port: 8888, as: 8888, global: true },
    { port: 3000, as: 3000, global: true }
  ],
  env: { 'JUPYTER_TOKEN': 'test' },
  cpu: 16,
  memory: '64Gi',
  storage: '500Gi',
  gpu: { units: 1, model: 'rtx6000-ada' },
  name: 'py-cuda',
  duration: '2h',
  mode: 'provider',
  region: 'westcoast',
  amount: 6, // 3 CST per hour for 2 hours
  count: 1
};

// Regular expressions for extracting parameters
const CPU_REGEX = /(\d+)\s*(cores?|cpus?|processors?)/i;
const MEMORY_REGEX = /(\d+)\s*(GB|GiB|G|MB|MiB|M)\s*(RAM|memory)/i;
const STORAGE_REGEX = /(\d+)\s*(GB|GiB|G|TB|TiB|T)\s*(storage|disk|space)/i;
const GPU_REGEX = /(nvidia|rtx|gtx|a100|h100|t4|v100|rtx\s*\d{4}|rtx\s*\d{4}\s*\w+)/i;
const GPU_COUNT_REGEX = /(\d+)\s*gpus?/i;
const DURATION_REGEX = /(\d+)\s*(hours?|hrs?|days?|weeks?|months?)/i;
const REGION_REGEX = /(us-east|us-west|eu-west|eu-central|ap-southeast|ap-northeast|westcoast|eastcoast)/i;

/**
 * Extract compute requirements from natural language description
 * @param description Natural language description of compute requirements
 * @returns Extracted parameters
 */
export function extractFromDescription(description: string): ExtractedParams {
  const params: ExtractedParams = {};
  
  // Extract CPU
  const cpuMatch = description.match(CPU_REGEX);
  if (cpuMatch) {
    params.cpu = parseInt(cpuMatch[1], 10);
  }
  
  // Extract memory
  const memoryMatch = description.match(MEMORY_REGEX);
  if (memoryMatch) {
    let memoryValue = parseInt(memoryMatch[1], 10);
    let memoryUnit = memoryMatch[2].toUpperCase();
    
    // Convert to standard format
    if (memoryUnit === 'G' || memoryUnit === 'GB') {
      memoryUnit = 'Gi';
    } else if (memoryUnit === 'M' || memoryUnit === 'MB') {
      memoryUnit = 'Mi';
    }
    
    params.memory = `${memoryValue}${memoryUnit}`;
  }
  
  // Extract storage
  const storageMatch = description.match(STORAGE_REGEX);
  if (storageMatch) {
    let storageValue = parseInt(storageMatch[1], 10);
    let storageUnit = storageMatch[2].toUpperCase();
    
    // Convert to standard format
    if (storageUnit === 'G' || storageUnit === 'GB') {
      storageUnit = 'Gi';
    } else if (storageUnit === 'T' || storageUnit === 'TB') {
      storageUnit = 'Ti';
    }
    
    params.storage = `${storageValue}${storageUnit}`;
  }
  
  // Extract GPU
  const gpuMatch = description.match(GPU_REGEX);
  if (gpuMatch) {
    params.gpu = params.gpu || {};
    
    // Extract GPU model
    let gpuModel = gpuMatch[1].toLowerCase();
    
    // Normalize GPU model names
    if (gpuModel.includes('rtx') && gpuModel.includes('4090')) {
      gpuModel = 'rtx4090';
    } else if (gpuModel.includes('rtx') && gpuModel.includes('6000') && gpuModel.includes('ada')) {
      gpuModel = 'rtx6000-ada';
    } else if (gpuModel === 'a100') {
      gpuModel = 'a100';
    } else if (gpuModel === 'h100') {
      gpuModel = 'h100';
    } else if (gpuModel === 't4') {
      gpuModel = 't4';
    } else if (gpuModel === 'v100') {
      gpuModel = 'v100';
    } else {
      // Default to rtx6000-ada if model is unclear
      gpuModel = 'rtx6000-ada';
    }
    
    params.gpu.model = gpuModel;
  }
  
  // Extract GPU count
  const gpuCountMatch = description.match(GPU_COUNT_REGEX);
  if (gpuCountMatch) {
    params.gpu = params.gpu || {};
    params.gpu.units = parseInt(gpuCountMatch[1], 10);
  } else if (params.gpu) {
    // Default to 1 GPU if model is specified but count isn't
    params.gpu.units = 1;
  }
  
  // Extract duration
  const durationMatch = description.match(DURATION_REGEX);
  if (durationMatch) {
    const value = parseInt(durationMatch[1], 10);
    const unit = durationMatch[2].toLowerCase();
    
    if (unit.startsWith('hour') || unit.startsWith('hr')) {
      params.duration = `${value}h`;
    } else if (unit.startsWith('day')) {
      params.duration = `${value}d`;
    } else if (unit.startsWith('week')) {
      params.duration = `${value * 7}d`;
    } else if (unit.startsWith('month')) {
      params.duration = `${value}mon`;
    }
  }
  
  // Extract region
  const regionMatch = description.match(REGION_REGEX);
  if (regionMatch) {
    let region = regionMatch[1].toLowerCase();
    
    // Normalize region names
    if (region === 'westcoast' || region === 'us-west') {
      region = 'westcoast';
    } else if (region === 'eastcoast' || region === 'us-east') {
      region = 'eastcoast';
    } else {
      // Default to westcoast if region is unclear
      region = 'westcoast';
    }
    
    params.region = region;
  }
  
  // Check for Jupyter notebook
  if (description.toLowerCase().includes('jupyter') || 
      description.toLowerCase().includes('notebook')) {
    params.image = 'spheronnetwork/jupyter-notebook:pytorch-2.4.1-cuda-enabled';
    params.env = { 'JUPYTER_TOKEN': 'test' };
    
    // Add Jupyter port if not already specified
    params.ports = [
      { port: 8888, as: 8888, global: true },
      { port: 3000, as: 3000, global: true }
    ];
  }
  
  // Set name based on image or default
  if (params.image && params.image.includes('jupyter')) {
    params.name = 'py-cuda';
  }
  
  // Always set token to CST and a reasonable amount based on resources
  params.amount = calculateAmount(params);
  
  return params;
}

/**
 * Calculate token amount based on duration at 3 CST per hour
 * @param params Extracted parameters
 * @returns Calculated amount
 */
function calculateAmount(params: ExtractedParams): number {
  // Default to 2 hours if duration is not specified
  if (!params.duration) {
    return 6; // 3 CST per hour * 2 hours
  }
  
  // Extract duration value and unit
  const durationMatch = params.duration.match(/(\d+)([a-z]+)/i);
  if (!durationMatch) {
    return 6; // Default to 2 hours if format is invalid
  }
  
  const value = parseInt(durationMatch[1], 10);
  const unit = durationMatch[2].toLowerCase();
  
  // Calculate amount based on duration (3 CST per hour)
  if (unit === 'h') {
    // Hours
    return value * 3;
  } else if (unit === 'd') {
    // Days (24 hours per day)
    return value * 24 * 3;
  } else if (unit === 'mon') {
    // Months (30 days per month)
    return value * 30 * 24 * 3;
  } else {
    // Default to 2 hours if unit is unknown
    return 6;
  }
}

/**
 * Identify missing required parameters
 * @param params Extracted parameters
 * @returns Array of missing parameter names
 */
export function identifyMissingParams(params: ExtractedParams): string[] {
  const missingParams: string[] = [];
  
  // Check for required parameters
  if (!params.cpu) missingParams.push('CPU cores');
  if (!params.memory) missingParams.push('memory (RAM)');
  if (!params.storage) missingParams.push('storage');
  if (!params.duration) missingParams.push('duration');
  
  // Check for GPU if it seems like a GPU workload
  if (params.image && 
      (params.image.includes('cuda') || 
       params.image.includes('pytorch') || 
       params.image.includes('tensorflow'))) {
    if (!params.gpu) missingParams.push('GPU model');
  }
  
  return missingParams;
}

/**
 * Merge extracted parameters with defaults
 * @param params Extracted parameters
 * @returns Merged parameters
 */
export function mergeWithDefaults(params: ExtractedParams): ExtractedParams {
  return {
    ...DEFAULT_PARAMS,
    ...params,
    // Merge nested objects
    gpu: {
      ...DEFAULT_PARAMS.gpu,
      ...params.gpu
    },
    env: {
      ...DEFAULT_PARAMS.env,
      ...params.env
    }
  };
}
