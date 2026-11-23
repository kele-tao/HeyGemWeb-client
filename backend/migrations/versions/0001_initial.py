"""HeyGem 商业版 v3 基线与表结构（7 张表 + 索引 + CHECK + 部分唯一索引）。

Revision ID: 0001_initial
Revises:
Create Date: 2026-05-01
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "0001_initial"
down_revision = None
branch_labels = None
depends_on = None

ACTIVE = "status IN ('queued','running')"


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.String(36), primary_key=True, nullable=False),
        sa.Column("email", sa.String(254), nullable=False, unique=True),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("status", sa.String(16), nullable=False, server_default="active"),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.Column("last_login_at", sa.DateTime(), nullable=True),
        sa.Column("password_changed_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    op.create_table(
        "auth_sessions",
        sa.Column("id", sa.String(36), primary_key=True, nullable=False),
        sa.Column(
            "user_id",
            sa.String(36),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("refresh_token_hash", sa.String(64), nullable=False, unique=True),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.Column("revoked_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("last_used_at", sa.DateTime(), nullable=True),
        sa.Column("user_agent", sa.String(255), nullable=True),
        sa.Column("client_ip", sa.String(64), nullable=True),
    )
    op.create_index("ix_auth_sessions_user", "auth_sessions", ["user_id", "revoked_at"])

    op.create_table(
        "avatars",
        sa.Column("id", sa.String(36), primary_key=True, nullable=False),
        sa.Column(
            "user_id",
            sa.String(36),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("name", sa.String(80), nullable=False),
        sa.Column("status", sa.String(16), nullable=False, server_default="processing"),
        sa.Column("source_rel_path", sa.Text(), nullable=True),
        sa.Column("thumb_rel_path", sa.Text(), nullable=True),
        sa.Column("duration_ms", sa.Integer(), nullable=True),
        sa.Column("width", sa.Integer(), nullable=True),
        sa.Column("height", sa.Integer(), nullable=True),
        sa.Column("size_bytes", sa.BigInteger(), nullable=True),
        sa.Column("error_code", sa.String(48), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.CheckConstraint("status IN ('processing','ready','failed')", name="ck_avatars_status"),
    )
    op.create_index("ix_avatars_user_created", "avatars", ["user_id", "created_at"])
    op.create_index("ix_avatars_user_status", "avatars", ["user_id", "status"])

    op.create_table(
        "voices",
        sa.Column("id", sa.String(36), primary_key=True, nullable=False),
        sa.Column(
            "user_id",
            sa.String(36),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("name", sa.String(80), nullable=False),
        sa.Column("status", sa.String(16), nullable=False, server_default="training"),
        sa.Column("sample_rel_path", sa.Text(), nullable=True),
        sa.Column("asr_rel_path", sa.Text(), nullable=True),
        sa.Column("reference_text", sa.Text(), nullable=True),
        sa.Column("duration_ms", sa.Integer(), nullable=True),
        sa.Column("size_bytes", sa.BigInteger(), nullable=True),
        sa.Column("error_code", sa.String(48), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.CheckConstraint("status IN ('training','complete','failed')", name="ck_voices_status"),
    )
    op.create_index("ix_voices_user_created", "voices", ["user_id", "created_at"])
    op.create_index("ix_voices_user_status", "voices", ["user_id", "status"])

    op.create_table(
        "audition_caches",
        sa.Column("id", sa.String(36), primary_key=True, nullable=False),
        sa.Column(
            "user_id",
            sa.String(36),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "voice_id",
            sa.String(36),
            sa.ForeignKey("voices.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("text_hash", sa.String(64), nullable=False),
        sa.Column("text_content", sa.Text(), nullable=False),
        sa.Column("audio_rel_path", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index(
        "uq_audition_voice_text", "audition_caches", ["voice_id", "text_hash"], unique=True
    )

    op.create_table(
        "videos",
        sa.Column("id", sa.String(36), primary_key=True, nullable=False),
        sa.Column(
            "user_id",
            sa.String(36),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("title", sa.String(120), nullable=False),
        sa.Column(
            "avatar_id",
            sa.String(36),
            sa.ForeignKey("avatars.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "voice_id",
            sa.String(36),
            sa.ForeignKey("voices.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("script", sa.Text(), nullable=True),
        sa.Column("status", sa.String(16), nullable=False, server_default="queued"),
        sa.Column("progress", sa.SmallInteger(), nullable=False, server_default="0"),
        sa.Column("thumb_rel_path", sa.Text(), nullable=True),
        sa.Column("audio_rel_path", sa.Text(), nullable=True),
        sa.Column("output_rel_path", sa.Text(), nullable=True),
        sa.Column("duration_ms", sa.Integer(), nullable=True),
        sa.Column("category", sa.String(32), nullable=True),
        sa.Column("share_token", sa.String(43), nullable=True, unique=True),
        sa.Column("error_code", sa.String(48), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.Column("completed_at", sa.DateTime(), nullable=True),
        sa.CheckConstraint(
            "status IN ('queued','processing','success','failed')", name="ck_videos_status"
        ),
        sa.CheckConstraint("progress BETWEEN 0 AND 100", name="ck_videos_progress"),
    )
    op.create_index("ix_videos_user_created", "videos", ["user_id", "created_at"])
    op.create_index("ix_videos_user_status", "videos", ["user_id", "status"])

    op.create_table(
        "jobs",
        sa.Column("id", sa.String(36), primary_key=True, nullable=False),
        sa.Column("kind", sa.String(24), nullable=False),
        sa.Column(
            "user_id",
            sa.String(36),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "avatar_id",
            sa.String(36),
            sa.ForeignKey("avatars.id", ondelete="CASCADE"),
            nullable=True,
        ),
        sa.Column(
            "voice_id",
            sa.String(36),
            sa.ForeignKey("voices.id", ondelete="CASCADE"),
            nullable=True,
        ),
        sa.Column(
            "video_id",
            sa.String(36),
            sa.ForeignKey("videos.id", ondelete="CASCADE"),
            nullable=True,
        ),
        sa.Column("status", sa.String(16), nullable=False, server_default="queued"),
        sa.Column("priority", sa.SmallInteger(), nullable=False, server_default="100"),
        sa.Column("attempt", sa.SmallInteger(), nullable=False, server_default="0"),
        sa.Column("max_attempts", sa.SmallInteger(), nullable=False, server_default="3"),
        sa.Column("run_after", sa.DateTime(), nullable=False),
        sa.Column("lease_owner", sa.String(64), nullable=True),
        sa.Column("lease_expires_at", sa.DateTime(), nullable=True),
        sa.Column("progress", sa.SmallInteger(), nullable=False, server_default="0"),
        sa.Column("ai_task_code", sa.String(64), nullable=True),
        sa.Column("payload_json", sa.Text(), nullable=True),
        sa.Column("error_code", sa.String(48), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.Column("started_at", sa.DateTime(), nullable=True),
        sa.Column("finished_at", sa.DateTime(), nullable=True),
        sa.CheckConstraint(
            "kind IN ('avatar_prepare','voice_train','video_synthesize')", name="ck_jobs_kind"
        ),
        sa.CheckConstraint(
            "status IN ('queued','running','succeeded','failed','canceled')",
            name="ck_jobs_status",
        ),
        sa.CheckConstraint(
            "(CASE WHEN avatar_id IS NOT NULL THEN 1 ELSE 0 END)"
            " + (CASE WHEN voice_id IS NOT NULL THEN 1 ELSE 0 END)"
            " + (CASE WHEN video_id IS NOT NULL THEN 1 ELSE 0 END) = 1",
            name="ck_jobs_single_resource",
        ),
    )
    op.create_index("ix_jobs_claim", "jobs", ["status", "run_after", "priority", "created_at"])
    op.create_index("ix_jobs_user", "jobs", ["user_id", "created_at"])
    op.create_index("ix_jobs_video", "jobs", ["video_id", "created_at"])
    # 部分唯一索引：同一资源同时只允许一个活跃任务
    op.execute(
        f"CREATE UNIQUE INDEX uq_jobs_active_video ON jobs (video_id) WHERE {ACTIVE}"
    )
    op.execute(
        f"CREATE UNIQUE INDEX uq_jobs_active_avatar ON jobs (avatar_id) WHERE {ACTIVE}"
    )
    op.execute(
        f"CREATE UNIQUE INDEX uq_jobs_active_voice ON jobs (voice_id) WHERE {ACTIVE}"
    )


def downgrade() -> None:
    op.drop_table("jobs")
    op.drop_table("videos")
    op.drop_table("audition_caches")
    op.drop_table("voices")
    op.drop_table("avatars")
    op.drop_table("auth_sessions")
    op.drop_table("users")
