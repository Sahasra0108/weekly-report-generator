from datetime import date, timedelta


def next_monday() -> str:
    today = date.today()
    monday = today - timedelta(days=today.weekday()) + timedelta(weeks=1)
    return monday.isoformat()


def minimal_report_payload(week: str | None = None) -> dict:
    return {
        "week_start_date": week or next_monday(),
        "project_id": None,
        "notes": None,
        "links": None,
        "tasks": [
            {
                "task_name": "Example task",
                "priority": "MEDIUM",
                "status": "COMPLETED",
                "planned_percent": 100,
                "actual_percent": 100,
                "hours_planned": 8,
                "hours_spent": 8,
                "output": "Done",
            }
        ],
        "planned_tasks": [],
        "blockers": [],
        "achievements": [],
        "hours": [{"work_type": "DEVELOPMENT", "hours": 20}],
    }


class TestAuthentication:
    def test_unauthenticated_request_is_rejected(self, client, users):
        assert client.get("/api/v1/auth/me").status_code == 401

    def test_login_sets_httponly_cookie(self, client, users):
        res = client.post(
            "/api/v1/auth/login",
            json={"email": "member@test.com", "password": "Password123!"},
        )
        assert res.status_code == 200
        cookie_header = res.headers.get("set-cookie", "")
        assert "access_token" in cookie_header
        assert "HttpOnly" in cookie_header

    def test_wrong_password_is_rejected(self, client, users):
        res = client.post(
            "/api/v1/auth/login",
            json={"email": "member@test.com", "password": "WrongPassword1!"},
        )
        assert res.status_code == 401

    def test_unknown_email_gives_same_error_as_wrong_password(self, client, users):
        unknown = client.post(
            "/api/v1/auth/login",
            json={"email": "nobody@test.com", "password": "Password123!"},
        )
        wrong_pw = client.post(
            "/api/v1/auth/login",
            json={"email": "member@test.com", "password": "WrongPassword1!"},
        )
        assert unknown.status_code == wrong_pw.status_code == 401
        assert unknown.json()["detail"] == wrong_pw.json()["detail"]

    def test_logout_clears_the_cookie(self, client, users, login_as):
        login_as("member@test.com")
        assert client.get("/api/v1/auth/me").status_code == 200
        client.post("/api/v1/auth/logout")
        assert client.get("/api/v1/auth/me").status_code == 401

    def test_deactivated_user_cannot_log_in(self, client, users, db):
        users["member"].is_active = False
        db.commit()
        res = client.post(
            "/api/v1/auth/login",
            json={"email": "member@test.com", "password": "Password123!"},
        )
        assert res.status_code == 403

    def test_tampered_token_is_rejected(self, client, users, login_as):
        login_as("member@test.com")
        client.cookies.set("access_token", "not.a.real.token")
        assert client.get("/api/v1/auth/me").status_code == 401


class TestRoleBasedAccess:
    def test_member_cannot_list_users(self, client, users, login_as):
        login_as("member@test.com")
        assert client.get("/api/v1/users").status_code == 403

    def test_manager_can_list_users(self, client, users, login_as):
        login_as("manager@test.com")
        assert client.get("/api/v1/users").status_code == 200

    def test_manager_cannot_create_users(self, client, users, login_as):
        login_as("manager@test.com")
        res = client.post(
            "/api/v1/users",
            json={
                "email": "new@test.com",
                "full_name": "New Person",
                "password": "Password123!",
                "role_name": "MEMBER",
            },
        )
        assert res.status_code == 403

    def test_admin_can_create_users(self, client, users, login_as):
        login_as("admin@test.com")
        res = client.post(
            "/api/v1/users",
            json={
                "email": "new@test.com",
                "full_name": "New Person",
                "password": "Password123!",
                "role_name": "MEMBER",
            },
        )
        assert res.status_code == 201

    def test_member_cannot_view_another_users_record(self, client, users, login_as):
        login_as("member@test.com")
        assert client.get(f"/api/v1/users/{users['other_member'].id}").status_code == 403

    def test_member_can_view_their_own_record(self, client, users, login_as):
        login_as("member@test.com")
        assert client.get(f"/api/v1/users/{users['member'].id}").status_code == 200

    def test_member_cannot_access_the_dashboard(self, client, users, login_as):
        login_as("member@test.com")
        assert client.get("/api/v1/dashboard/summary").status_code == 403

    def test_manager_can_access_the_dashboard(self, client, users, login_as):
        login_as("manager@test.com")
        assert client.get("/api/v1/dashboard/summary").status_code == 200


class TestReportOwnership:
    def _create_report_as(self, client, login_as, email: str) -> int:
        login_as(email)
        res = client.post("/api/v1/reports", json=minimal_report_payload())
        assert res.status_code == 201, res.text
        return res.json()["id"]

    def test_member_cannot_read_another_members_report(self, client, users, login_as):
        report_id = self._create_report_as(client, login_as, "member@test.com")

        login_as("other@test.com")
        # 404 rather than 403 - we don't confirm the report exists
        assert client.get(f"/api/v1/reports/{report_id}").status_code == 404

    def test_member_cannot_edit_another_members_report(self, client, users, login_as):
        report_id = self._create_report_as(client, login_as, "member@test.com")

        login_as("other@test.com")
        res = client.put(f"/api/v1/reports/{report_id}", json=minimal_report_payload())
        assert res.status_code == 404

    def test_member_cannot_submit_another_members_report(self, client, users, login_as):
        report_id = self._create_report_as(client, login_as, "member@test.com")

        login_as("other@test.com")
        assert client.post(f"/api/v1/reports/{report_id}/submit").status_code == 404

    def test_member_list_only_returns_their_own_reports(self, client, users, login_as):
        self._create_report_as(client, login_as, "member@test.com")
        self._create_report_as(client, login_as, "other@test.com")

        login_as("member@test.com")
        items = client.get("/api/v1/reports").json()["items"]
        assert all(item["author"]["email"] == "member@test.com" for item in items)

    def test_member_cannot_review_a_report(self, client, users, login_as):
        report_id = self._create_report_as(client, login_as, "member@test.com")
        client.post(f"/api/v1/reports/{report_id}/submit")

        login_as("other@test.com")
        res = client.post(
            f"/api/v1/reports/{report_id}/review",
            json={"action": "APPROVED", "comment": None},
        )
        assert res.status_code == 403

    def test_manager_can_read_any_members_report(self, client, users, login_as):
        report_id = self._create_report_as(client, login_as, "member@test.com")
        client.post(f"/api/v1/reports/{report_id}/submit")

        login_as("manager@test.com")
        assert client.get(f"/api/v1/reports/{report_id}").status_code == 200

    def test_manager_cannot_edit_report_content(self, client, users, login_as):
        report_id = self._create_report_as(client, login_as, "member@test.com")
        client.post(f"/api/v1/reports/{report_id}/submit")

        login_as("manager@test.com")
        res = client.put(f"/api/v1/reports/{report_id}", json=minimal_report_payload())
        assert res.status_code == 403

    def test_manager_does_not_see_drafts(self, client, users, login_as):
        self._create_report_as(client, login_as, "member@test.com")  # stays a draft

        login_as("manager@test.com")
        assert client.get("/api/v1/reports").json()["items"] == []


class TestReviewWorkflow:
    def _submitted_report(self, client, login_as) -> int:
        login_as("member@test.com")
        res = client.post("/api/v1/reports", json=minimal_report_payload())
        report_id = res.json()["id"]
        client.post(f"/api/v1/reports/{report_id}/submit")
        return report_id

    def test_full_correction_cycle(self, client, users, login_as):
        report_id = self._submitted_report(client, login_as)

        login_as("manager@test.com")
        res = client.post(
            f"/api/v1/reports/{report_id}/review",
            json={"action": "REQUESTED_CHANGES", "comment": "Please add more detail."},
        )
        assert res.status_code == 200
        assert res.json()["status"] == "NEEDS_CORRECTION"

        login_as("member@test.com")
        payload = minimal_report_payload()
        payload["notes"] = "Added the requested detail"
        assert client.put(f"/api/v1/reports/{report_id}", json=payload).status_code == 200

        res = client.post(f"/api/v1/reports/{report_id}/submit")
        assert res.json()["status"] == "SUBMITTED"
        assert res.json()["current_version_no"] == 2

        login_as("manager@test.com")
        res = client.post(
            f"/api/v1/reports/{report_id}/review",
            json={"action": "APPROVED", "comment": "Looks good."},
        )
        assert res.json()["status"] == "APPROVED"

    def test_version_history_is_retained(self, client, users, login_as):
        report_id = self._submitted_report(client, login_as)

        login_as("manager@test.com")
        client.post(
            f"/api/v1/reports/{report_id}/review",
            json={"action": "REQUESTED_CHANGES", "comment": "Fix this."},
        )

        login_as("member@test.com")
        client.put(f"/api/v1/reports/{report_id}", json=minimal_report_payload())
        client.post(f"/api/v1/reports/{report_id}/submit")

        versions = client.get(f"/api/v1/reports/{report_id}/versions").json()
        assert len(versions) == 2
        assert {v["version_no"] for v in versions} == {1, 2}

    def test_approved_report_cannot_be_edited(self, client, users, login_as):
        report_id = self._submitted_report(client, login_as)

        login_as("manager@test.com")
        client.post(
            f"/api/v1/reports/{report_id}/review",
            json={"action": "APPROVED", "comment": None},
        )

        login_as("member@test.com")
        res = client.put(f"/api/v1/reports/{report_id}", json=minimal_report_payload())
        assert res.status_code == 409

    def test_requesting_changes_without_a_comment_is_rejected(self, client, users, login_as):
        report_id = self._submitted_report(client, login_as)

        login_as("manager@test.com")
        res = client.post(
            f"/api/v1/reports/{report_id}/review",
            json={"action": "REQUESTED_CHANGES", "comment": "   "},
        )
        assert res.status_code == 422


class TestPrivilegeEscalation:
    def test_registration_ignores_a_requested_role(self, client, users):
        """A self-registering user must not be able to hand themselves ADMIN."""
        res = client.post(
            "/api/v1/auth/register",
            json={
                "email": "sneaky@test.com",
                "full_name": "Sneaky Person",
                "password": "Password123!",
                "role_name": "ADMIN",
            },
        )
        assert res.status_code == 201
        assert res.json()["role"]["name"] == "MEMBER"

    def test_admin_cannot_deactivate_themselves(self, client, users, login_as):
        login_as("admin@test.com")
        assert client.delete(f"/api/v1/users/{users['admin'].id}").status_code == 400

    def test_member_filtering_by_user_id_is_ignored(self, client, users, login_as):
        """A member passing ?user_id= must not see anyone else's reports."""
        login_as("other@test.com")
        res = client.post("/api/v1/reports", json=minimal_report_payload())
        other_report_id = res.json()["id"]
        client.post(f"/api/v1/reports/{other_report_id}/submit")

        login_as("member@test.com")
        items = client.get(
            f"/api/v1/reports?user_id={users['other_member'].id}"
        ).json()["items"]
        assert all(item["author"]["email"] == "member@test.com" for item in items)