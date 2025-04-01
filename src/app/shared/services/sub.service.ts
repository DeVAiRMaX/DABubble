import { Injectable, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class SubService implements OnDestroy {
  private groupedSubscriptions: Map<string, Subscription[]> = new Map();
  private readonly DEFAULT_GROUP = '__default__';

  constructor() {}

  add(subscription: Subscription, groupName?: string): void {
    const key = groupName || this.DEFAULT_GROUP;
    const subscriptionsInGroup = this.groupedSubscriptions.get(key) || [];
    subscriptionsInGroup.push(subscription);
    this.groupedSubscriptions.set(key, subscriptionsInGroup);
  }

  unsubscribeGroup(groupName: string): void {
    if (this.groupedSubscriptions.has(groupName)) {
      const subscriptions = this.groupedSubscriptions.get(groupName);
      subscriptions?.forEach((sub) => {
        if (sub && !sub.closed) {
          sub.unsubscribe();
        }
      });
      this.groupedSubscriptions.delete(groupName);
    } else {
      // fehlermeldung
    }
  }

  unsubscribeAll(): void {
    this.groupedSubscriptions.forEach((subscriptions, groupName) => {
      subscriptions.forEach((sub) => {
        if (sub && !sub.closed) {
          sub.unsubscribe();
        }
      });
    });
    this.groupedSubscriptions.clear();
  }

  ngOnDestroy(): void {
    this.unsubscribeAll();
  }
}
