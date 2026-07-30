"""
FORGE API Load Test Script
Simulates concurrent users interacting with the FORGE unified IDE API endpoints.
"""

from locust import HttpUser, task, between
import json
import random

class ForgeAPIUser(HttpUser):
    """Simulates a user interacting with the FORGE platform API."""
    
    # Wait time between tasks (randomly distributed between 1-5 seconds)
    wait_time = between(1, 5)
    
    # Sample data for various API calls
    MISSION_TEMPLATES = [
        {
            "goal": "Develop AI agent workflow",
            "nodes": ["architect", "backend", "frontend", "database", "docs"],
            "constraints": {"maxParallelism": 3}
        },
        {
            "goal": "Build cross-platform application",
            "nodes": ["frontend", "backend", "design", "testing"],
            "constraints": {"maxParallelism": 2}
        }
    ]
    
    TASK_NAMES = ["Refactor auth middleware", "Add new capability", "Optimize database queries", "Update documentation", "Fix security vulnerability"]
    
    def on_start(self):
        """Initialize at the start of each user session."""
        self.login()
    
    def login(self):
        """Simulate user login with OAuth/SAML authentication."""
        response = self.client.post(
            "/api/auth/login",
            json={
                "provider": "google",
                "email": f"user{random.randint(1000,9999)}@example.com",
                "password": "secure_password_123"
            },
            headers={"Content-Type": "application/json"}
        )
        if response.status_code == 200:
            self.token = response.json().get("accessToken", "")
            self.headers = {
                "Authorization": f"Bearer {self.token}",
                "X-CSRF-Token": self.get_csrf_token()
            }
        else:
            self.token = ""
            self.headers = {}
    
    def get_csrf_token(self):
        """Retrieve CSRF token from cookie or header."""
        # In a real implementation, this would extract from cookies
        return f"csrf-{random.randint(10000,99999)}"
    
    @task(3)
    def create_mission(self):
        """Create a new mission/workspace."""
        template = random.choice(self.MISSION_TEMPLATES)
        response = self.client.post(
            "/api/missions",
            json={
                "title": f"Mission {random.randint(1,100)}",
                "goal": template["goal"],
                "nodes": template["nodes"],
                "constraints": template["constraints"]
            },
            headers=self.headers
        )
        if response.status_code in [200, 201]:
            self.current_mission_id = response.json().get("id", "")
    
    @task(5)
    def list_missions(self):
        """List all missions."""
        response = self.client.get("/api/missions", headers=self.headers)
        if response.status_code == 200:
            missions = response.json()
            print(f"Fetched {len(missions)} missions")
    
    @task(2)
    def execute_task(self):
        """Execute a task within a mission."""
        if hasattr(self, 'current_mission_id'):
            response = self.client.post(
                f"/api/missions/{self.current_mission_id}/tasks",
                json={
                    "name": random.choice(self.TASK_NAMES),
                    "status": "pending"
                },
                headers=self.headers
            )
    
    @task(3)
    def get_performance_metrics(self):
        """Fetch performance metrics for monitoring."""
        response = self.client.get("/api/metrics/collect", headers=self.headers)
    
    @task(1)
    def logout(self):
        """End user session."""
        if hasattr(self, 'current_mission_id'):
            self.client.delete(f"/api/missions/{self.current_mission_id}", headers=self.headers)
        self.client.post("/api/auth/logout", headers=self.headers)
'''
echo "Created Locust load test script"
ls -la tests/performance/locust/
