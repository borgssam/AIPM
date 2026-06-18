import urllib.request
import json
from sqlalchemy.orm import Session
import models

def send_slack_notification(db: Session, message: str) -> bool:
    """
    project_settings 테이블에서 slack_webhook_url 설정을 읽어와 단방향 슬랙 실시간 알림을 발송합니다.
    """
    try:
        # DB에서 웹훅 URL 조회
        slack_setting = db.query(models.ProjectSetting).filter(
            models.ProjectSetting.key == "slack_webhook_url"
        ).first()
        
        if not slack_setting or not slack_setting.value:
            print("Slack notification skipped: 'slack_webhook_url' key is not configured in settings.")
            return False
            
        webhook_url = slack_setting.value
        if not webhook_url.startswith("http"):
            print(f"Slack notification skipped: invalid Webhook URL '{webhook_url}'")
            return False

        # 슬랙 인커밍 웹훅 전송 payload 구성
        payload = {
            "text": message
        }
        data = json.dumps(payload).encode('utf-8')
        
        # urllib 표준 라이브러리를 이용하여 외부 요청 전송 (의존성 패키지 설치 에러 방지)
        req = urllib.request.Request(
            webhook_url,
            data=data,
            headers={'Content-Type': 'application/json'}
        )
        
        with urllib.request.urlopen(req) as response:
            status_code = response.status
            if status_code == 200:
                print("Slack notification sent successfully.")
                return True
            else:
                print(f"Slack notification failed with status code: {status_code}")
                return False
                
    except Exception as e:
        print(f"Error occurred while sending Slack notification: {e}")
        return False
