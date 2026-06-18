import bcrypt

def test():
    plain = "123456"
    
    # bcrypt 해싱
    pwd_bytes = plain.encode('utf-8')
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(pwd_bytes, salt)
    hashed_str = hashed.decode('utf-8')
    
    print(f"Hashed string: {hashed_str}")
    print(f"Length of hash: {len(hashed_str)}")
    
    # 검증
    # 1. 바이트 대 바이트
    res1 = bcrypt.checkpw(pwd_bytes, hashed)
    print(f"Verify byte to byte: {res1}")
    
    # 2. 바이트 대 인코딩된 바이트
    res2 = bcrypt.checkpw(pwd_bytes, hashed_str.encode('utf-8'))
    print(f"Verify byte to encoded string: {res2}")

if __name__ == "__main__":
    test()
