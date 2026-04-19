from psycopg import AsyncConnection


class ProjectDataFetcher:
    """Class for fetching project data."""

    def __init__(self, connection: AsyncConnection, project_id: str) -> None:
        """
        Initialize ProjectDataFetcher with a database connection.

        :param connection: psycopg AsyncConnection instance.
        """
        self.connection = connection
        self.project_id: str = project_id

    async def get_project_context(self) -> str:
        """
        Get project context by project_id.

        :param project_id: UUID of the project.
        :return: Project description if found, None otherwise.
        """
        async with self.connection.cursor(binary=True) as cur:
            await cur.execute(
                """
                SELECT description
                FROM projects
                WHERE project_id = %(project_id)s;
                """,
                params={"project_id": self.project_id},
            )
            result = await cur.fetchone()
            if result is None:
                raise ValueError(f"Project with id {self.project_id} not found.")
            return result[0]

    async def get_project_features(self) -> list[str]:
        """
        Get project features by project_id.

        :param project_id: UUID of the project.
        :return: List of features associated with the project.
        """
        async with self.connection.cursor(binary=True) as cur:
            await cur.execute(
                """
                SELECT features
                FROM projects
                WHERE project_id = %(project_id)s;
                """,
                params={"project_id": self.project_id},
            )
            result = await cur.fetchone()
            if result is None:
                raise ValueError(f"Project with id {self.project_id} not found.")
            return result[0]

    async def get_next_ungenerated_type(self) -> tuple[str, str, str] | None:
        """
        Get the next ungenerated type for the project.

        :param project_id: UUID of the project.
        :return: Tuple of (id, name, description) if found, None otherwise.
        """
        async with self.connection.cursor(binary=True) as cur:
            await cur.execute(
                """
                SELECT type_id, title, description
                FROM types
                WHERE project_id = %(project_id)s
                  AND fields IS NULL
                LIMIT 1;
                """,
                params={"project_id": self.project_id},
            )
            result = await cur.fetchone()
            if result is None:
                return None
            return (str(result[0]), result[1], result[2])

    async def get_dot_graph(self) -> tuple[str, str]:
        """
        Get the dot graph for the project.

        :return: Tuple of (graph, description) if found, None otherwise.
        """
        async with self.connection.cursor(binary=True) as cur:
            await cur.execute(
                """
                SELECT (dot_graph).graph, (dot_graph).description
                FROM projects
                WHERE project_id = %(project_id)s;
                """,
                params={"project_id": self.project_id},
            )
            result = await cur.fetchone()
            if result is None:
                raise ValueError(f"Project with id {self.project_id} not found.")
            # If dot_graph is NULL, both fields will be None
            if result[0] is None and result[1] is None:
                raise ValueError(
                    f"Dot graph not found for project with id {self.project_id}."
                )
            return (result[0], result[1])
