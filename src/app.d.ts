declare global {
  namespace App {
    interface Locals {
      user: import('$lib/domain').User | null;
    }
  }
}

export {};
