import numpy as np

k = 0
f = 32

class Game:
    def __init__(self, frames):
        self.frames = frames

    def random_partial(self):
        frames = self.frames
        
        if k > frames.shape[0] - f:
            frames = np.pad(frames, [(0, k + f - len(frames)), (0, 0), (0, 0), (0, 0)], "constant")

        start = np.random.randint(k, frames.shape[0] - f + 1)
        return frames[start:start + f] 