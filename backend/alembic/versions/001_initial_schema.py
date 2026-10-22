"""initial_schema

Revision ID: 001_initial_schema
Revises: 
Create Date: 2026-10-23 05:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '001_initial_schema'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. runbooks table
    op.create_table(
        'runbooks',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('form_type', sa.String(length=100), nullable=True),
        sa.Column('ticket_type', sa.String(length=100), nullable=True),
        sa.Column('category', sa.String(length=100), nullable=True),
        sa.Column('product_area', sa.String(length=100), nullable=True),
        sa.Column('components', sa.String(length=255), nullable=True),
        sa.Column('source_type', sa.String(length=50), nullable=False, server_default='notion_csv'),
        sa.Column('source_page_id', sa.String(length=100), nullable=True),
        sa.Column('source_url', sa.Text(), nullable=True),
        sa.Column('source_updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('content_hash', sa.String(length=64), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_runbooks_title', 'runbooks', ['title'], unique=False)
    op.create_index('ix_runbooks_ticket_type', 'runbooks', ['ticket_type'], unique=False)
    op.create_index('ix_runbooks_category', 'runbooks', ['category'], unique=False)
    op.create_index('ix_runbooks_product_area', 'runbooks', ['product_area'], unique=False)
    op.create_index('ix_runbooks_components', 'runbooks', ['components'], unique=False)
    op.create_index('ix_runbooks_source_page_id', 'runbooks', ['source_page_id'], unique=False)
    op.create_index('ix_runbooks_content_hash', 'runbooks', ['content_hash'], unique=False)
    op.create_index('idx_runbook_title_components', 'runbooks', ['title', 'components'], unique=False)

    # 2. runbook_steps table
    op.create_table(
        'runbook_steps',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('runbook_id', sa.String(length=36), nullable=False),
        sa.Column('step_number', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('step_title', sa.String(length=255), nullable=True),
        sa.Column('command', sa.Text(), nullable=True),
        sa.Column('instruction', sa.Text(), nullable=True),
        sa.Column('warning', sa.Text(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.ForeignKeyConstraint(['runbook_id'], ['runbooks.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_runbook_steps_runbook_id', 'runbook_steps', ['runbook_id'], unique=False)
    op.create_index('idx_step_runbook_order', 'runbook_steps', ['runbook_id', 'step_number'], unique=False)

    # 3. ingestion_jobs table
    op.create_table(
        'ingestion_jobs',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('source_type', sa.String(length=50), nullable=False),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='pending'),
        sa.Column('started_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('records_processed', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('records_created', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('records_updated', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('records_skipped', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('error_summary', sa.Text(), nullable=True),
        sa.Column('details', sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )

    # 4. conversations table
    op.create_table(
        'conversations',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )

    # 5. messages table
    op.create_table(
        'messages',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('conversation_id', sa.String(length=36), nullable=False),
        sa.Column('role', sa.String(length=20), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('sources', sa.Text(), nullable=True),
        sa.Column('commands', sa.Text(), nullable=True),
        sa.Column('warnings', sa.Text(), nullable=True),
        sa.Column('suggested_followups', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.ForeignKeyConstraint(['conversation_id'], ['conversations.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_messages_conversation_id', 'messages', ['conversation_id'], unique=False)


def downgrade() -> None:
    op.drop_table('messages')
    op.drop_table('conversations')
    op.drop_table('ingestion_jobs')
    op.drop_table('runbook_steps')
    op.drop_table('runbooks')
