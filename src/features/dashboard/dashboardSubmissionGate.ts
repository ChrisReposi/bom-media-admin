export type SubmissionGate = {
  tryAcquire: () => boolean;
  release: () => void;
};

export function createSubmissionGate(): SubmissionGate {
  let locked = false;

  return {
    tryAcquire: () => {
      if (locked) return false;
      locked = true;
      return true;
    },
    release: () => {
      locked = false;
    },
  };
}
