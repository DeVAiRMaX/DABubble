export class newUserData {
  email: string;
  password: string;
  displayName: string;
  channelKeys: string[];
  uid?: string;
  avatar: string;

  constructor(obj?: any) {
    this.email = obj ? obj.email : '';
    this.password = obj ? obj.password : '';
    this.displayName = obj ? obj.displayName : '';
    this.channelKeys = obj ? obj.channelKeys : [];
    this.uid = obj?.uid;
    this.avatar = obj?.avatar;
  }

  public toJson(): any {
    return {
      email: this.email,
      password: this.password,
      displayName: this.displayName,
      channelKeys: this.channelKeys,
      uid: this.uid,
      avatar: this.avatar,
    };
  }
}
