/**
 * Train payloads for POST /api/pipeline/motion/run (enqueue_train).
 * Aligns with skill_foundry_rl amp_train / smoke_train expectations.
 */

export type MotionPipelineTrainMode = "amp" | "smoke";

/** Short AMP run for UI demos; longer wall-clock runs need worker timeout headroom. */
export type AmpTrainSize = "short" | "standard";

export function buildSmokeTrainConfig(): Record<string, unknown> {
  return {
    mode: "smoke",
    seed: 42,
    smoke_steps: 5,
    learning_rate: 0.01,
  };
}

export function buildAmpTrainConfig(
  mjcfPath: string,
  size: AmpTrainSize,
): Record<string, unknown> {
  const isShort = size === "short";
  return {
    mode: "amp",
    seed: 42,
    env: {
      mjcf_path: mjcfPath,
      sim_dt: 0.005,
      min_base_height: 0.2,
      max_episode_steps: 200,
      include_imu_in_obs: false,
    },
    ppo: {
      learning_rate: 3e-4,
      n_steps: isShort ? 256 : 2048,
      batch_size: isShort ? 64 : 256,
      n_epochs: isShort ? 2 : 10,
      total_timesteps: isShort ? 4096 : 100_000,
    },
    amp: {
      disc_hidden_dim: isShort ? 64 : 256,
      disc_num_layers: 2,
      disc_learning_rate: 3e-4,
      disc_batch_size: isShort ? 64 : 256,
      disc_updates_per_iter: isShort ? 1 : 4,
      policy_chunk_timesteps: isShort ? 256 : 2048,
      policy_rollout_steps: isShort ? 128 : 1024,
    },
    product_validation: { enabled: false },
  };
}
