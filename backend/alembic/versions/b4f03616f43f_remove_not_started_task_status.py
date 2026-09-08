"""remove NOT_STARTED task status

Revision ID: b4f03616f43f
Revises: 4a8602ced61c
Create Date: 2026-09-08 08:39:36.944378

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b4f03616f43f'
down_revision: Union[str, None] = '4a8602ced61c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Existing rows must satisfy the new constraint before it is applied.
    op.execute(
        "UPDATE report_tasks SET status = 'IN_PROGRESS' WHERE status = 'NOT_STARTED'"
    )
    op.alter_column(
        "report_tasks",
        "status",
        existing_type=sa.String(length=20),
        nullable=False,
    )


def downgrade() -> None:
    pass
