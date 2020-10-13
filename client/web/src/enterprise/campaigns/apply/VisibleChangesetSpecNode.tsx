import * as H from 'history'
import React, { useCallback, useState } from 'react'
import { VisibleChangesetSpecFields } from '../../../graphql-operations'
import { ThemeProps } from '../../../../../shared/src/theme'
import { FileDiffNode } from '../../../components/diff/FileDiffNode'
import { FileDiffConnection } from '../../../components/diff/FileDiffConnection'
import { map } from 'rxjs/operators'
import { queryChangesetSpecFileDiffs as _queryChangesetSpecFileDiffs } from './backend'
import { FilteredConnectionQueryArguments } from '../../../components/FilteredConnection'
import { Link } from '../../../../../shared/src/components/Link'
import { DiffStat } from '../../../components/diff/DiffStat'
import { ChangesetSpecAction } from './ChangesetSpecAction'
import ChevronDownIcon from 'mdi-react/ChevronDownIcon'
import ChevronRightIcon from 'mdi-react/ChevronRightIcon'
import { GitBranchChangesetDescriptionInfo } from './GitBranchChangesetDescriptionInfo'

export interface VisibleChangesetSpecNodeProps extends ThemeProps {
    node: VisibleChangesetSpecFields
    history: H.History
    location: H.Location

    /** Used for testing. */
    queryChangesetSpecFileDiffs?: typeof _queryChangesetSpecFileDiffs
    /** Expand changeset descriptions, for testing only. */
    expandChangesetDescriptions?: boolean
}

export const VisibleChangesetSpecNode: React.FunctionComponent<VisibleChangesetSpecNodeProps> = ({
    node,
    isLightTheme,
    history,
    location,
    queryChangesetSpecFileDiffs = _queryChangesetSpecFileDiffs,
    expandChangesetDescriptions = false,
}) => {
    const [isExpanded, setIsExpanded] = useState(expandChangesetDescriptions)
    const toggleIsExpanded = useCallback<React.MouseEventHandler<HTMLButtonElement>>(
        event => {
            event.preventDefault()
            setIsExpanded(!isExpanded)
        },
        [isExpanded]
    )

    /** Fetches the file diffs for the changeset */
    const queryFileDiffs = useCallback(
        (args: FilteredConnectionQueryArguments) =>
            queryChangesetSpecFileDiffs({
                after: args.after ?? null,
                first: args.first ?? null,
                changesetSpec: node.id,
                isLightTheme,
            }).pipe(map(diff => diff.fileDiffs)),
        [node.id, isLightTheme, queryChangesetSpecFileDiffs]
    )

    return (
        <>
            <button
                type="button"
                className="btn btn-icon test-campaigns-expand-changeset-spec"
                aria-label={isExpanded ? 'Collapse section' : 'Expand section'}
                onClick={toggleIsExpanded}
            >
                {isExpanded ? (
                    <ChevronDownIcon className="icon-inline" aria-label="Close section" />
                ) : (
                    <ChevronRightIcon className="icon-inline" aria-label="Expand section" />
                )}
            </button>
            <ChangesetSpecAction spec={node} />
            <div>
                <div className="d-flex flex-column">
                    <h3>
                        {node.description.__typename === 'ExistingChangesetReference' && (
                            <span>Import changeset #{node.description.externalID}</span>
                        )}
                        {node.description.__typename === 'GitBranchChangesetDescription' && (
                            <span>{node.description.title}</span>
                        )}
                    </h3>
                    <div className="mr-2">
                        <Link to={node.description.baseRepository.url} target="_blank" rel="noopener noreferrer">
                            {node.description.baseRepository.name}
                        </Link>{' '}
                        {node.description.__typename === 'GitBranchChangesetDescription' && (
                            <>
                                <span className="badge badge-primary">{node.description.baseRef}</span> &larr;{' '}
                                <span className="badge badge-primary">{node.description.headRef}</span>
                            </>
                        )}
                    </div>
                </div>
            </div>
            <div className="d-flex justify-content-center">
                {node.description.__typename === 'GitBranchChangesetDescription' && (
                    <DiffStat {...node.description.diffStat} expandedCounts={true} separateLines={true} />
                )}
            </div>
            {isExpanded && (
                <>
                    <div />
                    <div className="visible-changeset-spec-node__expanded-section">
                        {node.description.__typename === 'GitBranchChangesetDescription' && (
                            <>
                                <h4>Commits</h4>
                                <GitBranchChangesetDescriptionInfo
                                    description={node.description}
                                    isExpandedInitially={expandChangesetDescriptions}
                                />
                                <h4>Diff</h4>
                                <FileDiffConnection
                                    listClassName="list-group list-group-flush"
                                    noun="changed file"
                                    pluralNoun="changed files"
                                    queryConnection={queryFileDiffs}
                                    nodeComponent={FileDiffNode}
                                    nodeComponentProps={{
                                        history,
                                        location,
                                        isLightTheme,
                                        persistLines: true,
                                        lineNumbers: true,
                                    }}
                                    defaultFirst={15}
                                    hideSearch={true}
                                    noSummaryIfAllNodesVisible={true}
                                    history={history}
                                    location={location}
                                    useURLQuery={false}
                                    cursorPaging={true}
                                />
                            </>
                        )}
                        {node.description.__typename === 'ExistingChangesetReference' && (
                            <div className="alert alert-info mb-0">
                                When run, the changeset with ID {node.description.externalID} will be imported from{' '}
                                {node.description.baseRepository.name}.
                            </div>
                        )}
                    </div>
                </>
            )}
        </>
    )
}
