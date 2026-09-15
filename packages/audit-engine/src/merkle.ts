import * as crypto from 'crypto';

export function sha256(data: string | object): string {
  const content = typeof data === 'string' ? data : JSON.stringify(data);
  return crypto.createHash('sha256').update(content).digest('hex');
}

export class MerkleTree {
  private leaves: string[];
  private layers: string[][];

  constructor(leaves: string[]) {
    this.leaves = leaves.map(l => (l.length === 64 ? l : sha256(l)));
    this.layers = [];
    this.buildTree();
  }

  private buildTree() {
    if (this.leaves.length === 0) {
      this.layers = [['0'.repeat(64)]];
      return;
    }

    let currentLayer = [...this.leaves];
    this.layers.push(currentLayer);

    while (currentLayer.length > 1) {
      const nextLayer: string[] = [];
      for (let i = 0; i < currentLayer.length; i += 2) {
        if (i + 1 < currentLayer.length) {
          nextLayer.push(sha256(currentLayer[i] + currentLayer[i + 1]));
        } else {
          // Odd leaf: pair with itself
          nextLayer.push(sha256(currentLayer[i] + currentLayer[i]));
        }
      }
      this.layers.push(nextLayer);
      currentLayer = nextLayer;
    }
  }

  public getRoot(): string {
    if (this.layers.length === 0 || this.layers[this.layers.length - 1].length === 0) {
      return '0'.repeat(64);
    }
    return this.layers[this.layers.length - 1][0];
  }
}
