
'use client';

import React from 'react';
import { uomData } from '@/data/uom';
import Card, { CardHeader, CardContent } from '@/components/ui/Card';
import { Scale } from 'lucide-react';

const UomConfiguration: React.FC = () => {
    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-semibold text-foreground">Units of Measure</h1>
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <Scale className="h-6 w-6 text-sky-500"/>
                        <h2 className="text-xl font-medium text-foreground">Predefined UOMs</h2>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">This is a static list of available Units of Measure. It is not editable from the UI.</p>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6 pt-6">
                    {Object.entries(uomData).map(([category, uoms]) => (
                        <div key={category}>
                            <h3 className="font-semibold text-foreground border-b pb-2 mb-3">{category}</h3>
                            <ul className="space-y-2">
                                {uoms.map(uom => (
                                    <li key={uom.abbreviation} className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">{uom.name}</span>
                                        <span className="font-mono text-foreground bg-muted px-2 py-0.5 rounded-md">{uom.abbreviation}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </CardContent>
            </Card>
        </div>
    );
};

export default UomConfiguration;
