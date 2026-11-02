export function memoryStore(user) {
  const sessions=new Map();const attempts=new Map();
  return {
    sessions, attempts, user,
    async ping(){}, async close(){}, async cleanup(){},
    async findUser(username){return username===user.username?{...user}:null;},
    async attempt(key,limit){const count=(attempts.get(key)||0)+1;attempts.set(key,count);return count<=limit;},
    async resetAttempt(key){attempts.delete(key);},
    async createSession(hash,userId,expiry){sessions.set(hash,{userId,expiry});},
    async session(hash){const session=sessions.get(hash);return session&&session.expiry>new Date()&&user.status==='active'?{...user,expires_at:session.expiry}:null;},
    async logout(hash){sessions.delete(hash);},
    async changePassword(id,previousHash,newHash){if(user.id!==id||user.password_hash!==previousHash)return false;user.password_hash=newHash;sessions.clear();return true;},
  };
}
